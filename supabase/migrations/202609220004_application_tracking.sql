begin;
create function private.can_read_application(person_application uuid) returns boolean language sql stable set search_path='' as $$
  select exists(select 1 from public.applications where id=person_application);
$$;
create function private.owns_application_opportunity(person_application uuid) returns boolean language sql stable set search_path='' as $$
  select exists(select 1 from public.applications a join public.opportunities o on o.id=a.opportunity_id where a.id=person_application and o.owner_id=(select auth.uid()));
$$;
create function private.active_internship(person_application uuid) returns boolean language sql stable set search_path='' as $$
  select exists(select 1 from public.applications a join public.opportunities o on o.id=a.opportunity_id where a.id=person_application and a.status='Offered' and o.type in ('Internship','Apprenticeship','Live Project','Faculty Internship'));
$$;
revoke all on function private.can_read_application(uuid),private.owns_application_opportunity(uuid),private.active_internship(uuid) from public,anon;
grant execute on function private.can_read_application(uuid),private.owns_application_opportunity(uuid),private.active_internship(uuid) to authenticated,service_role;

create table public.application_events (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  actor_id uuid references public.profiles(id), event_type text not null,
  status text not null, next_step text not null, feedback text not null, progress integer not null,
  created_at timestamptz not null default now()
);
create index application_events_application_idx on public.application_events(application_id,created_at);
alter table public.application_events enable row level security;
create policy application_events_read on public.application_events for select to authenticated using(private.can_read_application(application_id));
revoke all on public.application_events from anon,authenticated;
grant select on public.application_events to authenticated;
grant all on public.application_events to service_role;
create function private.record_application_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' or row(new.status,new.next_step,new.feedback,new.progress) is distinct from row(old.status,old.next_step,old.feedback,old.progress) then
    insert into public.application_events(application_id,actor_id,event_type,status,next_step,feedback,progress)
    values(new.id,auth.uid(),case when tg_op='INSERT' then 'Application submitted' else 'Recruitment update' end,new.status,new.next_step,new.feedback,new.progress);
  end if;
  return new;
end $$;
create trigger application_history after insert or update on public.applications for each row execute function private.record_application_event();
-- Truthful baseline only: earlier transitions cannot be reconstructed.
insert into public.application_events(application_id,event_type,status,next_step,feedback,progress)
select id,'Tracking enabled — current snapshot',status,next_step,feedback,progress from public.applications;

create table public.internship_milestones (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 160), description text not null default '' check(length(description)<=4000),
  due_on date, status text not null default 'Pending' check(status in ('Pending','Approved')),
  feedback text not null default '' check(length(feedback)<=4000), reviewed_at timestamptz, created_at timestamptz not null default now()
);
create table public.internship_logs (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  milestone_id uuid references public.internship_milestones(id), author_id uuid not null default auth.uid() references public.profiles(id),
  week_ending date not null, summary text not null check(length(trim(summary)) between 10 and 4000),
  evidence_url text not null default '' check(length(evidence_url)<=2000 and (evidence_url='' or evidence_url ~ '^https?://')),
  created_at timestamptz not null default now()
);
create index internship_milestones_application_idx on public.internship_milestones(application_id);
create index internship_logs_application_idx on public.internship_logs(application_id);
alter table public.internship_milestones enable row level security;
alter table public.internship_logs enable row level security;
create policy milestones_read on public.internship_milestones for select to authenticated using(private.can_read_application(application_id));
create policy milestones_insert on public.internship_milestones for insert to authenticated with check(private.owns_application_opportunity(application_id) and private.active_internship(application_id));
create policy milestones_update on public.internship_milestones for update to authenticated using(private.owns_application_opportunity(application_id) and private.active_internship(application_id)) with check(private.owns_application_opportunity(application_id) and private.active_internship(application_id));
create policy logs_read on public.internship_logs for select to authenticated using(private.can_read_application(application_id));
create policy logs_insert on public.internship_logs for insert to authenticated with check(author_id=(select auth.uid()) and private.active_internship(application_id) and exists(select 1 from public.applications a where a.id=application_id and a.applicant_id=(select auth.uid())));
revoke all on public.internship_milestones,public.internship_logs from anon,authenticated;
grant select on public.internship_milestones,public.internship_logs to authenticated;
grant insert(application_id,title,description,due_on) on public.internship_milestones to authenticated;
grant update(status,feedback) on public.internship_milestones to authenticated;
grant insert(application_id,milestone_id,week_ending,summary,evidence_url) on public.internship_logs to authenticated;
grant all on public.internship_milestones,public.internship_logs to service_role;
create function private.validate_internship_log() returns trigger language plpgsql set search_path='' as $$
begin
  if new.week_ending > (now() at time zone 'Asia/Kolkata')::date then raise exception 'Log dates cannot be in the future'; end if;
  if new.milestone_id is not null and not exists(select 1 from public.internship_milestones m where m.id=new.milestone_id and m.application_id=new.application_id) then raise exception 'Milestone belongs to another internship'; end if;
  return new;
end $$;
create trigger validate_internship_log before insert on public.internship_logs for each row execute function private.validate_internship_log();
create function private.review_internship_milestone() returns trigger language plpgsql set search_path='' as $$
begin
  if new.status='Approved' and not exists(select 1 from public.internship_logs where milestone_id=new.id) then raise exception 'A student must submit a log for this milestone before approval'; end if;
  new.reviewed_at := case when new.status='Approved' then now() else null end;
  return new;
end $$;
create trigger review_internship_milestone before update on public.internship_milestones for each row execute function private.review_internship_milestone();
commit;
