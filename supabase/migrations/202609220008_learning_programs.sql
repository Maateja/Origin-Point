begin;
create table public.learning_programs (
 id uuid primary key references public.opportunities(id),
 format text not null check(format in ('Training','Workshop','Certification program','Mentorship','FDP')),
 level text not null check(level in ('Foundation','Intermediate','Advanced','All levels')),
 starts_on date not null, ends_on date not null check(ends_on>=starts_on),
 schedule text not null check(length(trim(schedule)) between 10 and 2000),
 prerequisites text not null check(length(trim(prerequisites)) between 10 and 3000),
 outcomes text[] not null check(cardinality(outcomes) between 2 and 12),
 curriculum text[] not null check(cardinality(curriculum) between 2 and 20),
 instructor text not null check(length(trim(instructor)) between 3 and 300),
 fee_terms text not null check(length(trim(fee_terms)) between 4 and 1000),
 credential_terms text not null check(length(trim(credential_terms)) between 10 and 2000),
 completion_rules text not null check(length(trim(completion_rules)) between 10 and 2000),
 contact text not null check(length(trim(contact)) between 5 and 300),
 created_at timestamptz not null default now()
);
create table public.program_enrollments (
 id uuid primary key default gen_random_uuid(), program_id uuid not null references public.learning_programs(id),
 learner_id uuid not null references public.profiles(id), learner_name text not null,
 status text not null default 'Enrolled' check(status in ('Enrolled','Completed','Withdrawn')),
 created_at timestamptz not null default now(), completed_at timestamptz,
 unique(program_id,learner_id)
);
create table public.program_submissions (
 id uuid primary key default gen_random_uuid(), enrollment_id uuid not null references public.program_enrollments(id),
 summary text not null check(length(trim(summary)) between 20 and 4000),
 evidence_url text not null check(length(evidence_url)<=2000 and evidence_url ~ '^https://'),
 created_at timestamptz not null default now()
);
create table public.program_reviews (
 id uuid primary key default gen_random_uuid(), submission_id uuid not null references public.program_submissions(id),
 reviewer_id uuid not null references public.profiles(id), reviewer_name text not null,
 decision text not null check(decision in ('Changes requested','Completed')),
 feedback text not null check(length(trim(feedback)) between 10 and 4000), created_at timestamptz not null default now()
);
create index program_enrollments_learner on public.program_enrollments(learner_id);
create index program_submissions_enrollment on public.program_submissions(enrollment_id,created_at);
create index program_reviews_submission on public.program_reviews(submission_id,created_at);
alter table public.learning_programs enable row level security;
alter table public.program_enrollments enable row level security;
alter table public.program_submissions enable row level security;
alter table public.program_reviews enable row level security;
revoke all on public.learning_programs,public.program_enrollments,public.program_submissions,public.program_reviews from public,anon,authenticated;
grant select on public.learning_programs,public.program_enrollments,public.program_submissions,public.program_reviews to authenticated;
grant all on public.learning_programs,public.program_enrollments,public.program_submissions,public.program_reviews to service_role;
create policy learning_programs_read on public.learning_programs for select to authenticated using(true);
create policy enrollments_read on public.program_enrollments for select to authenticated using(learner_id=auth.uid() or private.is_institution_member(learner_id) or exists(select 1 from public.opportunities where id=program_id and owner_id=auth.uid()));
create policy submissions_read on public.program_submissions for select to authenticated using(exists(select 1 from public.program_enrollments where id=enrollment_id));
create policy reviews_read on public.program_reviews for select to authenticated using(exists(select 1 from public.program_submissions where id=submission_id));

create function public.publish_learning_program(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare person public.profiles; result uuid; outcomes text[]; curriculum text[]; skills text[];
begin
 select * into person from public.profiles where id=auth.uid();
 if payload is null or octet_length(payload::text)>64000 then raise exception 'Program details are missing or too large'; end if;
 if auth.uid() is null or person.role is distinct from 'industry' then raise exception 'Only industry accounts can publish learning programs'; end if;
 if nullif(trim(person.organization),'') is null then raise exception 'Save your organization in your profile before publishing'; end if;
 if (payload->>'deadline')::date < (now() at time zone 'Asia/Kolkata')::date or (payload->>'starts_on')::date < (payload->>'deadline')::date then raise exception 'Enrollment deadline must be today or later and no later than the start date'; end if;
 select array_agg(trim(v)) into outcomes from jsonb_array_elements_text(payload->'outcomes') v;
 select array_agg(trim(v)) into curriculum from jsonb_array_elements_text(payload->'curriculum') v;
 select array_agg(trim(v)) into skills from jsonb_array_elements_text(payload->'skills') v;
 if exists(select 1 from unnest(outcomes||curriculum) v where length(v) not between 10 and 500) or coalesce(cardinality(skills),0) not between 1 and 20 or exists(select 1 from unnest(skills) v where length(v) not between 1 and 100) then raise exception 'Provide specific outcomes, curriculum items and 1–20 skills'; end if;
 insert into public.opportunities(owner_id,title,company,type,audience,location,work_mode,duration,deadline,skills,description,seats)
 values(auth.uid(),payload->>'title',person.organization,case when payload->>'format'='Certification program' then 'Training' else payload->>'format' end,payload->>'audience',payload->>'location',payload->>'work_mode',payload->>'duration',(payload->>'deadline')::date,skills,payload->>'description',(payload->>'seats')::integer) returning id into result;
 insert into public.learning_programs(id,format,level,starts_on,ends_on,schedule,prerequisites,outcomes,curriculum,instructor,fee_terms,credential_terms,completion_rules,contact)
 values(result,payload->>'format',payload->>'level',(payload->>'starts_on')::date,(payload->>'ends_on')::date,payload->>'schedule',payload->>'prerequisites',outcomes,curriculum,payload->>'instructor',payload->>'fee_terms',payload->>'credential_terms',payload->>'completion_rules',payload->>'contact');
 return result;
end $$;
create function public.enroll_learning_program(program uuid, accepted_terms boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare o public.opportunities; p public.profiles; existing public.program_enrollments; result uuid;
begin
 select * into o from public.opportunities where id=program for update;
 select * into p from public.profiles where id=auth.uid();
 if auth.uid() is null or p.role is null or p.role not in ('student','academician') or not exists(select 1 from public.learning_programs where id=program) or o.audience not in (p.role,'all') then raise exception 'This program is not available for your role'; end if;
 select * into existing from public.program_enrollments where program_id=program and learner_id=auth.uid();
 if found then
   if existing.status='Withdrawn' then raise exception 'This enrollment was withdrawn; contact the publisher'; end if;
   return existing.id;
 end if;
 if accepted_terms is distinct from true then raise exception 'Acknowledge the prerequisites and enrollment terms'; end if;
 if o.status<>'Open' or o.deadline<(now() at time zone 'Asia/Kolkata')::date then raise exception 'Enrollment is closed'; end if;
 if (select count(*) from public.program_enrollments where program_id=program and status<>'Withdrawn')>=o.seats then raise exception 'This cohort is full'; end if;
 insert into public.program_enrollments(program_id,learner_id,learner_name) values(program,auth.uid(),p.full_name) returning id into result;
 return result;
end $$;
create function public.withdraw_program_enrollment(enrollment uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 update public.program_enrollments set status='Withdrawn' where id=enrollment and learner_id=auth.uid() and status='Enrolled';
 if not found then raise exception 'Only your active enrollment can be withdrawn'; end if;
end $$;
create function public.submit_program_work(enrollment uuid, summary text, evidence text) returns uuid language plpgsql security definer set search_path='' as $$
declare e public.program_enrollments; result uuid;
begin
 select * into e from public.program_enrollments where id=enrollment for update;
 if auth.uid() is null or e.learner_id is distinct from auth.uid() or e.status<>'Enrolled' then raise exception 'Choose your active enrollment'; end if;
 if not exists(select 1 from public.learning_programs where id=e.program_id and starts_on<=(now() at time zone 'Asia/Kolkata')::date) then raise exception 'Submissions open on the program start date'; end if;
 insert into public.program_submissions(enrollment_id,summary,evidence_url) values(enrollment,trim(summary),trim(evidence)) returning id into result;
 return result;
end $$;
create function public.review_program_work(submission uuid, decision text, feedback text) returns void language plpgsql security definer set search_path='' as $$
declare s public.program_submissions; e public.program_enrollments;
begin
 select * into s from public.program_submissions where id=submission;
 select * into e from public.program_enrollments where id=s.enrollment_id for update;
 if auth.uid() is null or e.id is null or e.status<>'Enrolled' or not exists(select 1 from public.opportunities where id=e.program_id and owner_id=auth.uid()) then raise exception 'Only the publisher can review active enrollments'; end if;
 if s.id<>(select id from public.program_submissions where enrollment_id=e.id order by created_at desc,id desc limit 1) then raise exception 'Review the latest submission'; end if;
 insert into public.program_reviews(submission_id,reviewer_id,reviewer_name,decision,feedback) select s.id,auth.uid(),full_name,decision,trim(feedback) from public.profiles where id=auth.uid();
 if decision='Completed' then update public.program_enrollments set status='Completed',completed_at=now() where id=e.id; end if;
end $$;
-- Structured programs use enrollment, never recruitment or portfolio-sharing applications.
create function private.program_enrollment_not_application() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.learning_programs where id=new.opportunity_id) then raise exception 'Use program enrollment instead of a job application'; end if;
 return new;
end $$;
create trigger program_enrollment_not_application before insert on public.applications for each row execute function private.program_enrollment_not_application();
revoke all on function public.publish_learning_program(jsonb),public.enroll_learning_program(uuid,boolean),public.withdraw_program_enrollment(uuid),public.submit_program_work(uuid,text,text),public.review_program_work(uuid,text,text) from public,anon;
grant execute on function public.publish_learning_program(jsonb),public.enroll_learning_program(uuid,boolean),public.withdraw_program_enrollment(uuid),public.submit_program_work(uuid,text,text),public.review_program_work(uuid,text,text) to authenticated;
commit;
