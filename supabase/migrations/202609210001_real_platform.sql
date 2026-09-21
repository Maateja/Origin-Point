-- Origin Point: real, account-owned data. No seed or demonstration records.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

alter table public.profiles
  add column if not exists headline text not null default '',
  add column if not exists location text not null default '',
  add column if not exists bio text not null default '',
  add column if not exists organization text not null default '',
  add column if not exists department text not null default '',
  add column if not exists program text not null default '',
  add column if not exists graduation_year integer,
  add column if not exists website text not null default '',
  add column if not exists interests text[] not null default '{}',
  add column if not exists discoverable boolean not null default false;

create table public.portfolio_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  kind text not null check (kind in ('skill','certification','project','education','experience','achievement','document')),
  title text not null check (length(trim(title)) between 1 and 160),
  organization text not null default '',
  description text not null default '',
  url text not null default '' check (url = '' or url ~ '^https?://'),
  issued_on date,
  expires_on date,
  document_path text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_on is null or issued_on is null or expires_on >= issued_on)
);
create index portfolio_records_user_idx on public.portfolio_records(user_id, kind);
create unique index portfolio_unique_skill on public.portfolio_records(user_id, lower(trim(title))) where kind = 'skill';

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  title text not null check (length(trim(title)) between 4 and 160),
  company text not null check (length(trim(company)) > 0),
  type text not null check (type in ('Internship','Job','Apprenticeship','Live Project','Training','Workshop','Mentorship','FDP','Faculty Internship','Consultancy','Research')),
  audience text not null default 'student' check (audience in ('student','academician','all')),
  location text not null,
  work_mode text not null check (work_mode in ('Remote','Hybrid','On-site')),
  duration text not null,
  stipend text not null default '',
  deadline date not null,
  skills text[] not null default '{}',
  description text not null check (length(trim(description)) between 24 and 10000),
  seats integer not null check (seats between 1 and 500),
  status text not null default 'Open' check (status in ('Open','Closed')),
  created_at timestamptz not null default now()
);
create index opportunities_owner_idx on public.opportunities(owner_id, created_at desc);
create index opportunities_open_idx on public.opportunities(deadline) where status = 'Open';

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  match_score integer not null check (match_score between 0 and 100),
  status text not null default 'Applied' check (status in ('Applied','Under Review','Shortlisted','Interview Scheduled','Offered','Rejected','Completed')),
  next_step text not null default 'Awaiting review by the opportunity owner',
  feedback text not null default '',
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(opportunity_id, applicant_id)
);
create index applications_applicant_idx on public.applications(applicant_id, created_at desc);

create table public.saved_opportunities (
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  primary key(user_id, opportunity_id)
);
create index saved_opportunities_opportunity_idx on public.saved_opportunities(opportunity_id);

create table public.institution_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.profiles(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  status text not null default 'Pending' check (status in ('Pending','Approved','Declined')),
  created_at timestamptz not null default now(),
  unique(institution_id, member_id),
  check (institution_id <> member_id)
);
create index memberships_member_idx on public.institution_memberships(member_id, status);

-- Answer keys never have a client-readable policy. Scoring happens on the server.
create table public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic_id text not null,
  topic_title text not null,
  level_id text not null,
  level_title text not null,
  questions jsonb not null,
  report jsonb,
  source text not null,
  course_id text,
  module_id text,
  subtopic_id text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);
create index assessment_attempts_user_idx on public.assessment_attempts(user_id, created_at desc);
create table public.auth_request_limits (
  key_hash text primary key,
  window_start timestamptz not null default now(),
  requests integer not null default 1
);
alter table public.auth_request_limits enable row level security;
create function public.consume_auth_request(key_hash_value text) returns boolean language plpgsql security definer set search_path = '' as $$
declare calls integer;
begin
  insert into public.auth_request_limits(key_hash) values(key_hash_value)
  on conflict(key_hash) do update set
    requests=case when public.auth_request_limits.window_start < now()-interval '1 hour' then 1 else public.auth_request_limits.requests+1 end,
    window_start=case when public.auth_request_limits.window_start < now()-interval '1 hour' then now() else public.auth_request_limits.window_start end
  returning requests into calls;
  return calls <= 5;
end $$;
revoke all on public.auth_request_limits from anon,authenticated;
revoke all on function public.consume_auth_request(text) from public,anon,authenticated;
grant all on public.auth_request_limits to service_role;
grant execute on function public.consume_auth_request(text) to service_role;
create table public.assessment_reports (
  id uuid primary key references public.assessment_attempts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  report jsonb not null,
  score integer not null check (score between 0 and 100),
  created_at timestamptz not null default now()
);
create index assessment_reports_user_idx on public.assessment_reports(user_id, created_at desc);
create table public.learning_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  module_id text not null,
  subtopic_id text not null,
  score integer not null check (score between 0 and 100),
  completed_at timestamptz not null default now(),
  primary key(user_id, course_id, module_id, subtopic_id)
);

create function private.current_role() returns text language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid());
$$;
create function private.is_institution_member(person uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.institution_memberships where institution_id = (select auth.uid()) and member_id = person and status = 'Approved');
$$;
create function private.is_applicant(person uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.applications a join public.opportunities o on o.id = a.opportunity_id where a.applicant_id = person and o.owner_id = (select auth.uid()));
$$;
create function private.can_read_portfolio(person uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) = person or private.is_institution_member(person) or private.is_applicant(person);
$$;
revoke all on function private.current_role(), private.is_institution_member(uuid), private.is_applicant(uuid), private.can_read_portfolio(uuid) from public, anon;
grant execute on function private.current_role(), private.is_institution_member(uuid), private.is_applicant(uuid), private.can_read_portfolio(uuid) to authenticated;

-- Remove earlier permissive profile policies before installing scoped policies.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles'
  loop execute format('drop policy %I on public.profiles', p.policyname); end loop;
end $$;
alter table public.profiles enable row level security;
create policy profile_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profile_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create function private.protect_profile_role() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) = 'authenticated' and old.role is not null and new.role is distinct from old.role then
    raise exception 'An assigned account role cannot be changed through the profile editor.';
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger protect_profile_role before update on public.profiles for each row execute function private.protect_profile_role();

create function private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,email,full_name,role)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',''),
    case when new.raw_user_meta_data->>'role' in ('student','industry','academician','institution') then new.raw_user_meta_data->>'role' else null end)
  on conflict (id) do nothing;
  return new;
end $$;
create trigger origin_new_user after insert on auth.users for each row execute function private.handle_new_user();
insert into public.profiles(id,email,full_name,role)
select id,email,coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',''),
case when raw_user_meta_data->>'role' in ('student','industry','academician','institution') then raw_user_meta_data->>'role' else null end
from auth.users on conflict (id) do nothing;

alter table public.portfolio_records enable row level security;
create policy portfolio_read on public.portfolio_records for select to authenticated using (private.can_read_portfolio(user_id));
create policy portfolio_insert on public.portfolio_records for insert to authenticated with check (user_id = (select auth.uid()) and verified_at is null and (document_path is null or split_part(document_path,'/',1) = (select auth.uid())::text));
create policy portfolio_delete on public.portfolio_records for delete to authenticated using (user_id = (select auth.uid()));

alter table public.opportunities enable row level security;
create policy opportunities_read on public.opportunities for select to authenticated using (true);
create policy opportunities_insert on public.opportunities for insert to authenticated with check (owner_id = (select auth.uid()) and (select private.current_role()) in ('industry','academician','institution'));
create policy opportunities_update on public.opportunities for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

alter table public.applications enable row level security;
create policy applications_read on public.applications for select to authenticated using (applicant_id = (select auth.uid()) or private.is_institution_member(applicant_id) or exists(select 1 from public.opportunities o where o.id = opportunity_id and o.owner_id = (select auth.uid())));
create policy applications_update on public.applications for update to authenticated using (exists(select 1 from public.opportunities o where o.id = opportunity_id and o.owner_id = (select auth.uid()))) with check (exists(select 1 from public.opportunities o where o.id = opportunity_id and o.owner_id = (select auth.uid())));

create function private.application_updated() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status is distinct from old.status and not (
    (old.status = 'Applied' and new.status in ('Under Review','Shortlisted','Rejected')) or
    (old.status = 'Under Review' and new.status in ('Shortlisted','Rejected')) or
    (old.status = 'Shortlisted' and new.status in ('Interview Scheduled','Offered','Rejected')) or
    (old.status = 'Interview Scheduled' and new.status in ('Offered','Rejected')) or
    (old.status = 'Offered' and new.status = 'Completed')
  ) then raise exception 'Invalid application stage transition'; end if;
  new.updated_at = now();
  return new;
end $$;
create trigger application_updated before update on public.applications for each row execute function private.application_updated();

alter table public.saved_opportunities enable row level security;
create policy saved_own on public.saved_opportunities for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.institution_memberships enable row level security;
create policy membership_read on public.institution_memberships for select to authenticated using (member_id = (select auth.uid()) or institution_id = (select auth.uid()));
create policy membership_request on public.institution_memberships for insert to authenticated with check (member_id = (select auth.uid()) and status = 'Pending' and (select private.current_role()) in ('student','academician'));
create policy membership_review on public.institution_memberships for update to authenticated using (institution_id = (select auth.uid()) and (select private.current_role()) = 'institution') with check (institution_id = (select auth.uid()));
create policy membership_leave on public.institution_memberships for delete to authenticated using (member_id = (select auth.uid()) or institution_id = (select auth.uid()));

create function private.check_institution() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id = new.institution_id and role = 'institution') then raise exception 'Choose a registered institution'; end if;
  return new;
end $$;
create trigger membership_institution before insert on public.institution_memberships for each row execute function private.check_institution();

alter table public.assessment_attempts enable row level security;
alter table public.assessment_reports enable row level security;
create policy report_read on public.assessment_reports for select to authenticated using (user_id = (select auth.uid()) or private.is_institution_member(user_id));
alter table public.learning_progress enable row level security;
create policy progress_read on public.learning_progress for select to authenticated using (user_id = (select auth.uid()) or private.is_institution_member(user_id));

-- Return only directory fields, never account email addresses or private documents.
create function public.platform_directory() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'full_name',p.full_name,'role',p.role,'organization',p.organization,'headline',p.headline,
    'department',p.department,'program',p.program,'location',p.location,'bio',p.bio,'website',p.website,
    'skills',coalesce((select jsonb_agg(r.title) from public.portfolio_records r where r.user_id=p.id and r.kind='skill'),'[]'::jsonb)
  )),'[]'::jsonb) from public.profiles p where (select auth.uid()) is not null and (
    p.id = (select auth.uid()) or p.role in ('industry','institution') or p.discoverable
    or private.is_applicant(p.id) or private.is_institution_member(p.id)
    or exists(select 1 from public.institution_memberships m where m.institution_id = (select auth.uid()) and m.member_id = p.id)
  );
$$;

-- Atomic application creation; scores and applicant identity cannot be supplied by a client.
create function public.apply_to_opportunity(opportunity uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare job public.opportunities; person uuid := (select auth.uid()); account_role text; match_value integer; application_id uuid;
begin
  if person is null then raise exception 'Sign in to apply'; end if;
  select * into job from public.opportunities where id = opportunity for share;
  if not found then raise exception 'Opportunity not found'; end if;
  select role into account_role from public.profiles where id = person;
  if account_role is null or account_role not in ('student','academician') or (job.audience <> 'all' and job.audience <> account_role) or job.owner_id = person then raise exception 'This opportunity is not available to your account'; end if;
  if job.status <> 'Open' or job.deadline < (now() at time zone 'Asia/Kolkata')::date then raise exception 'Applications for this opportunity have closed'; end if;
  select case when count(*) = 0 then 0 else round(100.0 * count(*) filter(where exists(select 1 from public.portfolio_records r where r.user_id = person and r.kind = 'skill' and lower(trim(r.title)) = lower(trim(s)))) / count(*)) end
  into match_value from (select distinct lower(trim(s)) s from unnest(job.skills) s where trim(s) <> '') required;
  insert into public.applications(opportunity_id,applicant_id,match_score) values(opportunity,person,match_value)
  on conflict(opportunity_id,applicant_id) do nothing returning id into application_id;
  if application_id is null then select id into application_id from public.applications where opportunity_id=opportunity and applicant_id=person; end if;
  return application_id;
end $$;

-- Submit and publish a report and course progress in one transaction, service-only.
create function public.finish_assessment(attempt uuid, result jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.assessment_attempts;
begin
  select * into a from public.assessment_attempts where id=attempt for update;
  if not found then raise exception 'Assessment not found'; end if;
  if a.submitted_at is not null then return a.report; end if;
  update public.assessment_attempts set report=result,submitted_at=now() where id=attempt;
  if a.course_id is null then
    insert into public.assessment_reports(id,user_id,report,score) values(a.id,a.user_id,result,(result->>'scorePercent')::integer);
  else
    insert into public.learning_progress(user_id,course_id,module_id,subtopic_id,score) values(a.user_id,a.course_id,a.module_id,a.subtopic_id,(result->>'scorePercent')::integer)
    on conflict(user_id,course_id,module_id,subtopic_id) do update set score=excluded.score,completed_at=now();
  end if;
  return result;
end $$;
revoke all on function public.finish_assessment(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.finish_assessment(uuid,jsonb) to service_role;
revoke all on function public.platform_directory(), public.apply_to_opportunity(uuid) from public,anon;
grant execute on function public.platform_directory(), public.apply_to_opportunity(uuid) to authenticated;

revoke all on public.portfolio_records,public.opportunities,public.applications,public.saved_opportunities,public.institution_memberships,public.assessment_attempts,public.assessment_reports,public.learning_progress from anon,authenticated;
grant select,insert,delete on public.portfolio_records to authenticated;
grant select,insert on public.opportunities to authenticated;
grant update(status) on public.opportunities to authenticated;
grant select on public.applications,public.assessment_reports,public.learning_progress to authenticated;
grant update(status,next_step,feedback,progress) on public.applications to authenticated;
grant select,insert,delete on public.saved_opportunities,public.institution_memberships to authenticated;
grant update(status) on public.institution_memberships to authenticated;
grant all on public.portfolio_records,public.opportunities,public.applications,public.saved_opportunities,public.institution_memberships,public.assessment_attempts,public.assessment_reports,public.learning_progress to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('portfolio-documents','portfolio-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy origin_document_insert on storage.objects for insert to authenticated with check (bucket_id='portfolio-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy origin_document_read on storage.objects for select to authenticated using (bucket_id='portfolio-documents' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.portfolio_records r where r.document_path = name and private.can_read_portfolio(r.user_id))));
create policy origin_document_delete on storage.objects for delete to authenticated using (bucket_id='portfolio-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
