begin;
create table public.internship_arrangements (
  id uuid primary key default gen_random_uuid(), application_id uuid not null unique references public.applications(id) on delete cascade,
  start_on date, end_on date, response text not null default 'Pending' check(response in ('Pending','Accepted','Declined')),
  responded_at timestamptz, created_at timestamptz not null default now(),
  check ((start_on is null and end_on is null) or (start_on is not null and end_on is not null and end_on>=start_on))
);
create table public.internship_supervisors (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  supervisor_id uuid not null references public.profiles(id), assigned_by uuid not null references public.profiles(id),
  kind text not null check(kind in ('Mentor','Faculty')), status text not null default 'Pending' check(status in ('Pending','Accepted','Declined','Revoked')),
  created_at timestamptz not null default now(), responded_at timestamptz
);
create unique index internship_supervisor_active on public.internship_supervisors(application_id,kind) where status in ('Pending','Accepted');
create index internship_supervisors_person on public.internship_supervisors(supervisor_id);
alter table public.internship_arrangements enable row level security;
alter table public.internship_supervisors enable row level security;
revoke all on public.internship_arrangements,public.internship_supervisors from anon,authenticated;
grant select on public.internship_arrangements,public.internship_supervisors to authenticated;
grant all on public.internship_arrangements,public.internship_supervisors to service_role;

create function private.is_internship_supervisor(app uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.internship_supervisors s join public.applications a on a.id=s.application_id
 where s.application_id=app and s.supervisor_id=auth.uid() and s.status='Accepted' and
 (s.kind='Mentor' or (exists(select 1 from public.institution_memberships m where m.institution_id=s.assigned_by and m.member_id=a.applicant_id and m.status='Approved') and exists(select 1 from public.institution_memberships m where m.institution_id=s.assigned_by and m.member_id=s.supervisor_id and m.status='Approved'))));
$$;
revoke all on function private.is_internship_supervisor(uuid) from public,anon;
grant execute on function private.is_internship_supervisor(uuid) to authenticated,service_role;
create or replace function private.can_read_application(person_application uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.applications where id=person_application) or private.is_internship_supervisor(person_application);
$$;
-- Assignment acceptance grants tracking access only, never profiles/portfolios.
create policy arrangements_read on public.internship_arrangements for select to authenticated using(private.can_read_application(application_id));
create policy supervisors_read on public.internship_supervisors for select to authenticated using(supervisor_id=auth.uid() or private.can_read_application(application_id));

create function public.configure_internship(app uuid, begins date, ends date) returns void language plpgsql security definer set search_path='' as $$
declare a public.applications; o public.opportunities; r public.internship_arrangements;
begin
 select * into a from public.applications where id=app for update;
 select * into o from public.opportunities where id=a.opportunity_id;
 if auth.uid() is null or o.owner_id is distinct from auth.uid() or a.status<>'Offered' or o.type not in ('Internship','Apprenticeship','Live Project','Faculty Internship') then raise exception 'Only the opportunity owner can configure an offered internship'; end if;
 if begins is null or ends is null or ends<begins then raise exception 'Choose valid start and end dates'; end if;
 select * into r from public.internship_arrangements where application_id=app;
 if found and r.response<>'Pending' then raise exception 'Dates cannot change after the applicant has responded'; end if;
 insert into public.internship_arrangements(application_id,start_on,end_on) values(app,begins,ends) on conflict(application_id) do update set start_on=excluded.start_on,end_on=excluded.end_on;
 insert into public.application_events(application_id,actor_id,event_type,status,next_step,feedback,progress) values(app,auth.uid(),'Internship dates proposed',a.status,'Proposed dates: '||begins::text||' to '||ends::text,'',a.progress);
end $$;
create function public.respond_internship_offer(app uuid, decision text) returns void language plpgsql security definer set search_path='' as $$
declare a public.applications; r public.internship_arrangements;
begin
 select * into a from public.applications where id=app for update;
 if auth.uid() is null or a.applicant_id is distinct from auth.uid() or a.status<>'Offered' then raise exception 'Only the applicant can respond to this offer'; end if;
 if decision not in ('Accepted','Declined') or decision is null then raise exception 'Choose Accepted or Declined'; end if;
 select * into r from public.internship_arrangements where application_id=app for update;
 if not found or r.start_on is null then raise exception 'The opportunity owner must propose dates first'; end if;
 if r.response<>'Pending' then raise exception 'Your response is already recorded'; end if;
 update public.internship_arrangements set response=decision,responded_at=now() where id=r.id;
 insert into public.application_events(application_id,actor_id,event_type,status,next_step,feedback,progress) values(app,auth.uid(),'Offer '||lower(decision),a.status,'Applicant '||lower(decision)||' the proposed internship dates','',a.progress);
end $$;
create or replace function private.active_internship(person_application uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.applications a join public.opportunities o on o.id=a.opportunity_id join public.internship_arrangements r on r.application_id=a.id where a.id=person_application and a.status='Offered' and r.response='Accepted' and r.start_on <= (now() at time zone 'Asia/Kolkata')::date and o.type in ('Internship','Apprenticeship','Live Project','Faculty Internship'));
$$;

create function public.assign_internship_supervisor(app uuid, person uuid, assignment_kind text) returns void language plpgsql security definer set search_path='' as $$
declare a public.applications; o public.opportunities; person_role text;
begin
 select * into a from public.applications where id=app for update;
 select * into o from public.opportunities where id=a.opportunity_id;
 if auth.uid() is null or a.id is null or (a.status<>'Offered' and not (a.status='Completed' and person is null)) or o.type not in ('Internship','Apprenticeship','Live Project','Faculty Internship') then raise exception 'Choose an offered internship; completed assignments may only be revoked'; end if;
 if assignment_kind is null or assignment_kind not in ('Mentor','Faculty') then raise exception 'Unknown supervision role'; end if;
 if assignment_kind='Mentor' and o.owner_id is distinct from auth.uid() then raise exception 'Only the opportunity owner assigns mentors'; end if;
 if assignment_kind='Faculty' and not exists(select 1 from public.institution_memberships m where m.institution_id=auth.uid() and m.member_id=a.applicant_id and m.status='Approved') then raise exception 'Only an approved institution assigns faculty'; end if;
 if person is not null then
   select role into person_role from public.profiles where id=person;
   if person=a.applicant_id or person_role is null or (assignment_kind='Mentor' and person_role<>'industry') or (assignment_kind='Faculty' and (person_role<>'academician' or not exists(select 1 from public.institution_memberships m where m.institution_id=auth.uid() and m.member_id=person and m.status='Approved'))) then raise exception 'Choose an eligible supervisor'; end if;
 end if;
 -- Institutions may not replace another institution's faculty assignment.
 if assignment_kind='Faculty' and exists(select 1 from public.internship_supervisors s where s.application_id=app and s.kind='Faculty' and s.status in ('Pending','Accepted') and s.assigned_by<>auth.uid()) then raise exception 'Another institution manages this faculty assignment'; end if;
 update public.internship_supervisors set status='Revoked' where application_id=app and kind=assignment_kind and status in ('Pending','Accepted');
 if person is not null then insert into public.internship_supervisors(application_id,supervisor_id,assigned_by,kind) values(app,person,auth.uid(),assignment_kind); end if;
 insert into public.application_events(application_id,actor_id,event_type,status,next_step,feedback,progress) values(app,auth.uid(),assignment_kind||' assignment updated',a.status,case when person is null then 'Assignment revoked' else 'Invitation pending supervisor acceptance' end,'',a.progress);
end $$;
create function public.respond_supervision(invitation uuid, decision text) returns void language plpgsql security definer set search_path='' as $$
declare s public.internship_supervisors; a public.applications;
begin
 select application_id into s.application_id from public.internship_supervisors where id=invitation;
 select * into a from public.applications where id=s.application_id for update;
 select * into s from public.internship_supervisors where id=invitation for update;
 if auth.uid() is null or s.supervisor_id is distinct from auth.uid() or s.status<>'Pending' or a.status<>'Offered' then raise exception 'No pending invitation available'; end if;
 if decision is null or decision not in ('Accepted','Declined') then raise exception 'Choose Accepted or Declined'; end if;
 if decision='Accepted' and s.kind='Faculty' and (not exists(select 1 from public.institution_memberships where institution_id=s.assigned_by and member_id=s.supervisor_id and status='Approved') or not exists(select 1 from public.institution_memberships where institution_id=s.assigned_by and member_id=a.applicant_id and status='Approved')) then raise exception 'Approved membership is required for faculty supervision'; end if;
 update public.internship_supervisors set status=decision,responded_at=now() where id=invitation;
 insert into public.application_events(application_id,actor_id,event_type,status,next_step,feedback,progress) values(a.id,auth.uid(),s.kind||' invitation '||lower(decision),a.status,'Supervisor response recorded','',a.progress);
end $$;
create function public.my_supervision() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'application_id',a.id,'kind',s.kind,'status',s.status,'application_status',a.status,'title',o.title,'company',o.company,'applicant_name',p.full_name,'can_access',private.is_internship_supervisor(a.id))),'[]'::jsonb)
 from public.internship_supervisors s join public.applications a on a.id=s.application_id join public.opportunities o on o.id=a.opportunity_id join public.profiles p on p.id=a.applicant_id
 where s.supervisor_id=auth.uid() and s.status in ('Pending','Accepted');
$$;
drop policy milestones_update on public.internship_milestones;
create policy milestones_update on public.internship_milestones for update to authenticated using((private.owns_application_opportunity(application_id) or private.is_internship_supervisor(application_id)) and private.active_internship(application_id)) with check((private.owns_application_opportunity(application_id) or private.is_internship_supervisor(application_id)) and private.active_internship(application_id));
revoke all on function public.configure_internship(uuid,date,date),public.respond_internship_offer(uuid,text),public.assign_internship_supervisor(uuid,uuid,text),public.respond_supervision(uuid,text),public.my_supervision() from public,anon;
grant execute on function public.configure_internship(uuid,date,date),public.respond_internship_offer(uuid,text),public.assign_internship_supervisor(uuid,uuid,text),public.respond_supervision(uuid,text),public.my_supervision() to authenticated;
create function private.check_internship_completion() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status='Offered' and new.status='Completed' and exists(select 1 from public.opportunities o where o.id=new.opportunity_id and o.type in ('Internship','Apprenticeship','Live Project','Faculty Internship')) then
   if not private.active_internship(new.id) then raise exception 'Internship acceptance and a reached start date are required before completion'; end if;
   if exists(select 1 from public.internship_milestones where application_id=new.id and status<>'Approved') then raise exception 'Approve pending milestones before completing the internship'; end if;
 end if;
 return new;
end $$;
create trigger internship_completion_check before update on public.applications for each row execute function private.check_internship_completion();
commit;
