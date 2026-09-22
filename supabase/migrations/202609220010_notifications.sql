begin;
create table public.notifications (
 id uuid primary key default gen_random_uuid(), recipient_id uuid not null references public.profiles(id) on delete cascade,
 category text not null, title text not null, href text not null check(href ~ '^/(student|industry|academician|institution)/'),
 event_key text not null, created_at timestamptz not null default now(), read_at timestamptz,
 unique(recipient_id,event_key)
);
create index notifications_recipient_created on public.notifications(recipient_id,created_at desc,id desc);
create index notifications_unread on public.notifications(recipient_id) where read_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from public,anon,authenticated;
grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;
create policy notifications_read on public.notifications for select to authenticated using(recipient_id=auth.uid());
create function private.send_notification(person uuid, category text, title text, href text, event_key text) returns void language sql security definer set search_path='' as $$
 insert into public.notifications(recipient_id,category,title,href,event_key)
 select person,category,title,href,event_key where person is not null and person is distinct from auth.uid()
 on conflict(recipient_id,event_key) do nothing;
$$;
create function private.notify_application(app uuid, category text, title text, event_key text, supervisors boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare a public.applications; owner uuid; p record; destination text;
begin
 select * into a from public.applications where id=app;
 select owner_id into owner from public.opportunities where id=a.opportunity_id;
 for p in select id,role from public.profiles where id in (
  select a.applicant_id union select owner union select institution_id from public.institution_memberships where member_id=a.applicant_id and status='Approved'
  union select s.supervisor_id from public.internship_supervisors s where supervisors and s.application_id=app and s.status='Accepted' and (s.kind='Mentor' or (exists(select 1 from public.institution_memberships m where m.institution_id=s.assigned_by and m.member_id=a.applicant_id and m.status='Approved') and exists(select 1 from public.institution_memberships m where m.institution_id=s.assigned_by and m.member_id=s.supervisor_id and m.status='Approved'))))
 loop
  destination:=case when p.id=a.applicant_id then '/'||p.role||'/applications' when p.id=owner then '/'||p.role||'/candidates' when p.role='institution' then '/institution/placement' else '/'||p.role||'/supervision' end;
  perform private.send_notification(p.id,category,title,destination,event_key);
 end loop;
end $$;
create function private.notify_program(enrollment uuid, title text, event_key text) returns void language plpgsql security definer set search_path='' as $$
declare e public.program_enrollments; owner uuid; p record;
begin
 select * into e from public.program_enrollments where id=enrollment;
 select owner_id into owner from public.opportunities where id=e.program_id;
 for p in select id,role from public.profiles where id in (select e.learner_id union select owner union select institution_id from public.institution_memberships where member_id=e.learner_id and status='Approved') loop
 perform private.send_notification(p.id,'Learning',title,'/'||p.role||'/programs?program='||e.program_id::text,event_key);
 end loop;
end $$;
create function private.notify_workflow_event() returns trigger language plpgsql security definer set search_path='' as $$
declare app uuid; enrollment uuid; person_role text;
begin
 case tg_table_name
 when 'application_events' then
  perform private.notify_application(new.application_id,'Applications',new.event_type,'application-event:'||new.id::text);
 when 'internship_reports' then
  perform private.notify_application(new.application_id,'Internship','A new internship report is ready for review','report:'||new.id::text,true);
 when 'internship_logs' then
  perform private.notify_application(new.application_id,'Internship','New internship progress was submitted','internship-log:'||new.id::text,true);
 when 'internship_milestones' then
  if tg_op='INSERT' then perform private.notify_application(new.application_id,'Internship','A new internship milestone was assigned','milestone:'||new.id::text,true);
  elsif row(new.status,new.feedback) is distinct from row(old.status,old.feedback) then perform private.notify_application(new.application_id,'Internship','An internship milestone review was updated','milestone-review:'||gen_random_uuid()::text,true); end if;
 when 'internship_report_reviews' then
  select application_id into app from public.internship_reports where id=new.report_id;
  perform private.notify_application(app,'Internship','Internship report feedback is available','report-review:'||new.id::text,true);
 when 'internship_certificates' then
  if tg_op='INSERT' then perform private.notify_application(new.application_id,'Certificate','A completion certificate was issued','certificate:'||new.id::text);
  elsif new.revoked_at is distinct from old.revoked_at then perform private.notify_application(new.application_id,'Certificate','A completion certificate was revoked','certificate-revoked:'||new.id::text); end if;
 when 'internship_supervisors' then
  select role into person_role from public.profiles where id=new.supervisor_id;
  if tg_op='INSERT' then perform private.send_notification(new.supervisor_id,'Supervision','You have a new supervision invitation','/'||person_role||'/supervision','supervision:'||new.id::text);
  elsif new.status='Revoked' and old.status<>'Revoked' then perform private.send_notification(new.supervisor_id,'Supervision','A supervision assignment was revoked','/'||person_role||'/supervision','supervision-revoked:'||new.id::text); end if;
 when 'program_enrollments' then
  if tg_op='INSERT' then perform private.notify_program(new.id,'A learner enrolled in a program','enrollment:'||new.id::text);
  elsif new.status='Withdrawn' and old.status<>'Withdrawn' then perform private.notify_program(new.id,'A program enrollment was withdrawn','enrollment-withdrawn:'||new.id::text); end if;
 when 'program_submissions' then
  perform private.notify_program(new.enrollment_id,'New program work is ready for review','program-work:'||new.id::text);
 when 'program_reviews' then
  select enrollment_id into enrollment from public.program_submissions where id=new.submission_id;
  perform private.notify_program(enrollment,'Program feedback or completion is available','program-review:'||new.id::text);
 when 'institution_memberships' then
  if tg_op='INSERT' then perform private.send_notification(new.institution_id,'Membership','A membership request needs review','/institution/students','membership:'||new.id::text);
  elsif new.status is distinct from old.status then
   select role into person_role from public.profiles where id=new.member_id;
   perform private.send_notification(new.member_id,'Membership','Your institution membership status changed','/'||person_role||'/profile','membership-change:'||gen_random_uuid()::text);
  end if;
 end case;
 return new;
end $$;
create trigger notify_application_event after insert on public.application_events for each row execute function private.notify_workflow_event();
create trigger notify_internship_report after insert on public.internship_reports for each row execute function private.notify_workflow_event();
create trigger notify_internship_log after insert on public.internship_logs for each row execute function private.notify_workflow_event();
create trigger notify_internship_milestone after insert or update on public.internship_milestones for each row execute function private.notify_workflow_event();
create trigger notify_report_review after insert on public.internship_report_reviews for each row execute function private.notify_workflow_event();
create trigger notify_certificate after insert or update on public.internship_certificates for each row execute function private.notify_workflow_event();
create trigger notify_supervision after insert or update on public.internship_supervisors for each row execute function private.notify_workflow_event();
create trigger notify_enrollment after insert or update on public.program_enrollments for each row execute function private.notify_workflow_event();
create trigger notify_program_work after insert on public.program_submissions for each row execute function private.notify_workflow_event();
create trigger notify_program_review after insert on public.program_reviews for each row execute function private.notify_workflow_event();
create trigger notify_membership after insert or update on public.institution_memberships for each row execute function private.notify_workflow_event();
revoke all on function private.send_notification(uuid,text,text,text,text),private.notify_application(uuid,text,text,text,boolean),private.notify_program(uuid,text,text),private.notify_workflow_event() from public,anon,authenticated;
create function public.mark_notification_read(notification uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 update public.notifications set read_at=now() where id=notification and recipient_id=auth.uid() and read_at is null;
end $$;
create function public.mark_all_notifications_read() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Please sign in'; end if;
 update public.notifications set read_at=now() where recipient_id=auth.uid() and read_at is null;
end $$;
revoke all on function public.mark_notification_read(uuid),public.mark_all_notifications_read() from public,anon;
grant execute on function public.mark_notification_read(uuid),public.mark_all_notifications_read() to authenticated;
commit;
