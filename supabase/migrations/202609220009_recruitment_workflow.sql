begin;
create table public.application_interviews (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id),
 starts_at timestamptz not null, duration_minutes integer not null check(duration_minutes between 15 and 480),
 mode text not null check(mode in ('Video','Phone','On-site')), location text not null check(length(trim(location)) between 3 and 1000),
 instructions text not null check(length(trim(instructions)) between 10 and 4000),
 status text not null default 'Scheduled' check(status in ('Scheduled','Cancelled')),
 response text not null default 'Pending' check(response in ('Pending','Confirmed','Reschedule requested')),
 response_note text not null default '' check(length(response_note)<=2000), responded_at timestamptz,
 created_at timestamptz not null default now()
);
create unique index application_active_interview on public.application_interviews(application_id) where status='Scheduled';
create table public.placement_offers (
 id uuid primary key default gen_random_uuid(), application_id uuid not null unique references public.applications(id),
 title text not null, organization text not null, compensation text not null check(length(trim(compensation)) between 3 and 1000),
 terms text not null check(length(trim(terms)) between 20 and 5000), joining_on date not null, expires_at timestamptz not null,
 response text not null default 'Pending' check(response in ('Pending','Accepted','Declined','Withdrawn')),
 responded_at timestamptz, employer_joined_at timestamptz, applicant_joined_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.application_interviews enable row level security;
alter table public.placement_offers enable row level security;
revoke all on public.application_interviews,public.placement_offers from public,anon,authenticated;
grant select on public.application_interviews,public.placement_offers to authenticated;
grant all on public.application_interviews,public.placement_offers to service_role;
-- Recruitment terms follow application access, not internship supervisor access.
create policy interviews_read on public.application_interviews for select to authenticated using(exists(select 1 from public.applications where id=application_id));
create policy offers_read on public.placement_offers for select to authenticated using(exists(select 1 from public.applications where id=application_id));
create function private.recruitment_event(app uuid,label text,message text) returns void language sql security definer set search_path='' as $$
 insert into public.application_events(application_id,actor_id,event_type,status,next_step,feedback,progress)
 select id,auth.uid(),label,status,message,'',progress from public.applications where id=app;
$$;
revoke all on function private.recruitment_event(uuid,text,text) from public,anon,authenticated;
create function public.schedule_application_interview(app uuid, starts timestamptz, minutes integer, channel text, place text, notes text) returns void language plpgsql security definer set search_path='' as $$
declare a public.applications;
begin
 select * into a from public.applications where id=app for update;
 if auth.uid() is null or not private.owns_application_opportunity(app) or a.status not in ('Shortlisted','Interview Scheduled') then raise exception 'Only the owner can schedule shortlisted applications'; end if;
 if starts is null or starts<=now() then raise exception 'Choose a future interview time'; end if;
 update public.application_interviews set status='Cancelled' where application_id=app and status='Scheduled';
 insert into public.application_interviews(application_id,starts_at,duration_minutes,mode,location,instructions) values(app,starts,minutes,channel,trim(place),trim(notes));
 update public.applications set status='Interview Scheduled' where id=app;
 perform private.recruitment_event(app,'Interview scheduled','Interview details available in recruitment tracking');
end $$;
create function public.cancel_application_interview(interview uuid) returns void language plpgsql security definer set search_path='' as $$
declare i public.application_interviews;
begin
 select * into i from public.application_interviews where id=interview;
 perform 1 from public.applications where id=i.application_id for update;
 if auth.uid() is null or not private.owns_application_opportunity(i.application_id) then raise exception 'Only the owner can cancel an interview'; end if;
 update public.application_interviews set status='Cancelled' where id=interview and status='Scheduled';
 if found then perform private.recruitment_event(i.application_id,'Interview cancelled','The scheduled interview was cancelled'); end if;
end $$;
create function public.respond_application_interview(interview uuid, decision text, note text) returns void language plpgsql security definer set search_path='' as $$
declare i public.application_interviews; a public.applications;
begin
 select * into i from public.application_interviews where id=interview;
 select * into a from public.applications where id=i.application_id for update;
 select * into i from public.application_interviews where id=interview;
 if auth.uid() is null or a.applicant_id is distinct from auth.uid() or a.status<>'Interview Scheduled' or i.status<>'Scheduled' or i.starts_at<=now() then raise exception 'Only the applicant can respond to an upcoming active interview'; end if;
 if decision is null or decision not in ('Confirmed','Reschedule requested') then raise exception 'Choose a valid interview response'; end if;
 if decision='Reschedule requested' and length(trim(coalesce(note,'')))<10 then raise exception 'Explain your preferred alternative time'; end if;
 update public.application_interviews set response=decision,response_note=trim(coalesce(note,'')),responded_at=now() where id=interview;
 perform private.recruitment_event(a.id,'Interview response',decision);
end $$;
create function public.issue_placement_offer(app uuid, pay text, conditions text, joining date, expires timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare a public.applications; o public.opportunities;
begin
 select * into a from public.applications where id=app for update;
 select * into o from public.opportunities where id=a.opportunity_id;
 if auth.uid() is null or o.owner_id is distinct from auth.uid() or o.type<>'Job' or a.status not in ('Shortlisted','Interview Scheduled','Offered') then raise exception 'Only the job owner can issue offers to shortlisted candidates'; end if;
 if expires is null or expires<=now() or joining is null or joining<(expires at time zone 'Asia/Kolkata')::date then raise exception 'Choose a future response deadline no later than the joining date'; end if;
 if exists(select 1 from public.placement_offers where application_id=app) then raise exception 'An offer already exists; its published terms cannot be replaced'; end if;
 insert into public.placement_offers(application_id,title,organization,compensation,terms,joining_on,expires_at) values(app,o.title,o.company,trim(pay),trim(conditions),joining,expires);
 update public.applications set status='Offered' where id=app;
 update public.application_interviews set status='Cancelled' where application_id=app and status='Scheduled';
 perform private.recruitment_event(app,'Placement offer issued','Review the written offer terms and response deadline');
end $$;
create function public.respond_placement_offer(offer uuid, decision text) returns void language plpgsql security definer set search_path='' as $$
declare o public.placement_offers; a public.applications;
begin
 select * into o from public.placement_offers where id=offer;
 select * into a from public.applications where id=o.application_id for update;
 select * into o from public.placement_offers where id=offer;
 if auth.uid() is null or a.applicant_id is distinct from auth.uid() or a.status<>'Offered' or o.response<>'Pending' or o.expires_at<=now() then raise exception 'Only the applicant can respond to an unexpired pending offer'; end if;
 if decision is null or decision not in ('Accepted','Declined') then raise exception 'Choose Accepted or Declined'; end if;
 update public.placement_offers set response=decision,responded_at=now() where id=offer;
 perform private.recruitment_event(a.id,'Placement offer response',decision);
end $$;
create function public.withdraw_placement_offer(offer uuid) returns void language plpgsql security definer set search_path='' as $$
declare o public.placement_offers;
begin
 select * into o from public.placement_offers where id=offer;
 perform 1 from public.applications where id=o.application_id for update;
 if auth.uid() is null or not private.owns_application_opportunity(o.application_id) then raise exception 'Only the owner can withdraw an offer'; end if;
 update public.placement_offers set response='Withdrawn',responded_at=now() where id=offer and response='Pending';
 if not found then raise exception 'Only a pending offer may be withdrawn'; end if;
 perform private.recruitment_event(o.application_id,'Placement offer withdrawn','The pending offer was withdrawn by the owner');
end $$;
create function public.record_placement_joining(offer uuid) returns void language plpgsql security definer set search_path='' as $$
declare o public.placement_offers; a public.applications;
begin
 select * into o from public.placement_offers where id=offer;
 select * into a from public.applications where id=o.application_id for update;
 select * into o from public.placement_offers where id=offer;
 if auth.uid() is null or o.response<>'Accepted' or o.joining_on>(now() at time zone 'Asia/Kolkata')::date or a.status not in ('Offered','Completed') then raise exception 'An accepted offer and a reached joining date are required'; end if;
 if private.owns_application_opportunity(a.id) then
   if o.employer_joined_at is not null then return; end if;
   update public.placement_offers set employer_joined_at=now() where id=offer;
   perform private.recruitment_event(a.id,'Joining reported','Employer reported joining; applicant confirmation is required');
 elsif a.applicant_id=auth.uid() then
   if o.employer_joined_at is null then raise exception 'The employer must report joining first'; end if;
   if o.applicant_joined_at is not null then return; end if;
   update public.placement_offers set applicant_joined_at=now() where id=offer;
   update public.applications set status='Completed',progress=100 where id=a.id;
   perform private.recruitment_event(a.id,'Joining confirmed','Employer and applicant confirmed joining');
 else raise exception 'Only the employer or applicant can confirm joining'; end if;
end $$;
create function private.require_confirmed_placement() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status='Offered' and new.status='Completed' and exists(select 1 from public.opportunities where id=new.opportunity_id and type='Job') and not exists(select 1 from public.placement_offers where application_id=new.id and response='Accepted' and employer_joined_at is not null and applicant_joined_at is not null) then raise exception 'Job completion requires employer and applicant joining confirmation'; end if;
 return new;
end $$;
create trigger z_confirmed_placement before update on public.applications for each row execute function private.require_confirmed_placement();
revoke all on function public.schedule_application_interview(uuid,timestamptz,integer,text,text,text),public.cancel_application_interview(uuid),public.respond_application_interview(uuid,text,text),public.issue_placement_offer(uuid,text,text,date,timestamptz),public.respond_placement_offer(uuid,text),public.withdraw_placement_offer(uuid),public.record_placement_joining(uuid) from public,anon;
grant execute on function public.schedule_application_interview(uuid,timestamptz,integer,text,text,text),public.cancel_application_interview(uuid),public.respond_application_interview(uuid,text,text),public.issue_placement_offer(uuid,text,text,date,timestamptz),public.respond_placement_offer(uuid,text),public.withdraw_placement_offer(uuid),public.record_placement_joining(uuid) to authenticated;
commit;
