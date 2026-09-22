begin;
create table public.internship_reports (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id),
 author_id uuid not null references public.profiles(id), kind text not null check(kind in ('Progress','Final')),
 title text not null check(length(trim(title)) between 1 and 160), summary text not null check(length(trim(summary)) between 10 and 4000),
 document_path text not null unique, created_at timestamptz not null default now()
);
create table public.internship_report_reviews (
 id uuid primary key default gen_random_uuid(), report_id uuid not null references public.internship_reports(id),
 reviewer_id uuid not null references public.profiles(id), reviewer_name text not null,
 review_role text not null check(review_role in ('Industry','Faculty')),
 decision text not null check(decision in ('Approved','Changes requested')), feedback text not null check(length(trim(feedback)) between 10 and 4000),
 created_at timestamptz not null default now()
);
create table public.internship_completions (
 id uuid primary key default gen_random_uuid(), application_id uuid not null unique references public.applications(id),
 report_id uuid not null references public.internship_reports(id), applicant_id uuid not null references public.profiles(id),
 confirmed_by uuid not null references public.profiles(id), confirmed_name text not null, title text not null, organization text not null,
 start_on date not null, end_on date not null, industry_review_id uuid not null references public.internship_report_reviews(id),
 faculty_review_id uuid references public.internship_report_reviews(id), created_at timestamptz not null default now()
);
create index internship_reports_application on public.internship_reports(application_id,created_at);
create index internship_reviews_report on public.internship_report_reviews(report_id,created_at);
alter table public.internship_reports enable row level security;
alter table public.internship_report_reviews enable row level security;
alter table public.internship_completions enable row level security;
revoke all on public.internship_reports,public.internship_report_reviews,public.internship_completions from public,anon,authenticated;
grant select on public.internship_reports,public.internship_report_reviews,public.internship_completions to authenticated;
grant all on public.internship_reports,public.internship_report_reviews,public.internship_completions to service_role;
create policy reports_read on public.internship_reports for select to authenticated using(private.can_read_application(application_id));
create policy report_reviews_read on public.internship_report_reviews for select to authenticated using(exists(select 1 from public.internship_reports r where r.id=report_id));
create policy completions_read on public.internship_completions for select to authenticated using(private.can_read_application(application_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('internship-reports','internship-reports',false,10485760,array['application/pdf']);
-- Paths: applicant UUID / application UUID / random UUID.pdf. No overwrites.
create policy internship_file_insert on storage.objects for insert to authenticated with check (
 bucket_id='internship-reports' and split_part(name,'/',1)=auth.uid()::text and
 exists(select 1 from public.applications a where a.id::text=split_part(name,'/',2) and a.applicant_id=auth.uid() and private.active_internship(a.id))
);
create policy internship_file_read on storage.objects for select to authenticated using (
 bucket_id='internship-reports' and (split_part(name,'/',1)=auth.uid()::text or exists(select 1 from public.internship_reports r where r.document_path=name))
);
-- No authenticated DELETE/UPDATE: evidence cannot disappear during submission.
-- Unattached uploads are cleaned up by an administrator, never by the client.

create function public.submit_internship_report(app uuid, report_kind text, report_title text, report_summary text, path text) returns uuid language plpgsql security definer set search_path='' as $$
declare a public.applications; result uuid;
begin
 select * into a from public.applications where id=app for update;
 if auth.uid() is null or a.applicant_id is distinct from auth.uid() or not private.active_internship(app) then raise exception 'Only the applicant of an active internship can submit a report'; end if;
 if split_part(path,'/',1)<>auth.uid()::text or split_part(path,'/',2)<>app::text or not exists(select 1 from storage.objects where bucket_id='internship-reports' and name=path) then raise exception 'Upload your PDF to this internship first'; end if;
 insert into public.internship_reports(application_id,author_id,kind,title,summary,document_path) values(app,auth.uid(),report_kind,trim(report_title),trim(report_summary),path) returning id into result;
 return result;
end $$;

create function public.review_internship_report(report uuid, result text, comments text) returns void language plpgsql security definer set search_path='' as $$
declare r public.internship_reports; a public.applications; review_kind text;
begin
 select * into r from public.internship_reports where id=report;
 select * into a from public.applications where id=r.application_id for update;
 if auth.uid() is null or not private.active_internship(a.id) then raise exception 'Choose a report from an active internship'; end if;
 if private.owns_application_opportunity(a.id) then review_kind:='Industry';
 elsif private.is_internship_supervisor(a.id) then
   select case when kind='Mentor' then 'Industry' else 'Faculty' end into review_kind from public.internship_supervisors where application_id=a.id and supervisor_id=auth.uid() and status='Accepted';
 end if;
 if review_kind is null then raise exception 'Only the owner or an accepted assigned supervisor can review'; end if;
 if r.id<>(select id from public.internship_reports where application_id=a.id and kind=r.kind order by created_at desc,id desc limit 1) then raise exception 'Review the latest version of this report'; end if;
 insert into public.internship_report_reviews(report_id,reviewer_id,reviewer_name,review_role,decision,feedback) select r.id,auth.uid(),coalesce(full_name,'Reviewer'),review_kind,result,trim(comments) from public.profiles where id=auth.uid();
end $$;

create function public.complete_reviewed_internship(app uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.applications; o public.opportunities; r public.internship_reports; dates public.internship_arrangements; ir public.internship_report_reviews; fr public.internship_report_reviews; faculty_required boolean;
begin
 select * into a from public.applications where id=app for update;
 select * into o from public.opportunities where id=a.opportunity_id;
 if auth.uid() is null or o.owner_id is distinct from auth.uid() then raise exception 'Only the opportunity owner can confirm completion'; end if;
 if exists(select 1 from public.internship_completions where application_id=app) then return; end if;
 if not private.active_internship(app) then raise exception 'An accepted, started internship is required'; end if;
 select * into dates from public.internship_arrangements where application_id=app;
 select * into r from public.internship_reports where application_id=app and kind='Final' order by created_at desc,id desc limit 1;
 if r.id is null then raise exception 'Submit a final report before completion'; end if;
 select * into ir from public.internship_report_reviews where report_id=r.id and review_role='Industry' order by created_at desc,id desc limit 1;
 if ir.id is null or ir.decision<>'Approved' then raise exception 'The latest final report needs industry approval'; end if;
 if ir.reviewer_id<>o.owner_id and not exists(select 1 from public.internship_supervisors where application_id=app and supervisor_id=ir.reviewer_id and kind='Mentor' and status='Accepted') then raise exception 'A current industry reviewer must approve the final report'; end if;
 select exists(select 1 from public.internship_supervisors where application_id=app and kind='Faculty' and status in ('Pending','Accepted')) into faculty_required;
 select * into fr from public.internship_report_reviews where report_id=r.id and review_role='Faculty' order by created_at desc,id desc limit 1;
 if faculty_required and (fr.id is null or fr.decision<>'Approved' or not exists(select 1 from public.internship_supervisors s where s.application_id=app and s.supervisor_id=fr.reviewer_id and s.kind='Faculty' and s.status='Accepted' and exists(select 1 from public.institution_memberships where institution_id=s.assigned_by and member_id=s.supervisor_id and status='Approved') and exists(select 1 from public.institution_memberships where institution_id=s.assigned_by and member_id=a.applicant_id and status='Approved'))) then raise exception 'The current assigned faculty supervisor must approve the final report'; end if;
 insert into public.internship_completions(application_id,report_id,applicant_id,confirmed_by,confirmed_name,title,organization,start_on,end_on,industry_review_id,faculty_review_id)
 select app,r.id,a.applicant_id,auth.uid(),coalesce(full_name,'Opportunity owner'),o.title,o.company,dates.start_on,dates.end_on,ir.id,case when faculty_required then fr.id else null end from public.profiles where id=auth.uid();
 update public.applications set status='Completed',progress=100 where id=app;
end $$;
create function private.require_reviewed_completion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status='Offered' and new.status='Completed' and exists(select 1 from public.opportunities where id=new.opportunity_id and type in ('Internship','Apprenticeship','Live Project','Faculty Internship')) and not exists(select 1 from public.internship_completions where application_id=new.id) then raise exception 'Complete this internship through the final report review workflow'; end if;
 return new;
end $$;
create trigger z_require_reviewed_completion before update on public.applications for each row execute function private.require_reviewed_completion();
revoke all on function public.submit_internship_report(uuid,text,text,text,text),public.review_internship_report(uuid,text,text),public.complete_reviewed_internship(uuid) from public,anon;
grant execute on function public.submit_internship_report(uuid,text,text,text,text),public.review_internship_report(uuid,text,text),public.complete_reviewed_internship(uuid) to authenticated;
commit;
