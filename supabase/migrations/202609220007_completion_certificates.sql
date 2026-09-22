begin;
create table public.internship_certificates (
 id uuid primary key default gen_random_uuid(),
 completion_id uuid not null unique references public.internship_completions(id),
 application_id uuid not null references public.applications(id),
 issued_by uuid not null references public.profiles(id),
 recipient_name text not null, issuer_name text not null,
 title text not null, organization text not null,
 start_on date not null, end_on date not null, completed_at timestamptz not null,
 report_id uuid not null references public.internship_reports(id),
 industry_reviewer text not null, faculty_reviewer text,
 created_at timestamptz not null default now(),
 revoked_at timestamptz, revoked_by uuid references public.profiles(id), revocation_reason text,
 check ((revoked_at is null and revoked_by is null and revocation_reason is null) or
 (revoked_at is not null and revoked_by is not null and length(trim(revocation_reason)) between 10 and 1000))
);
alter table public.internship_certificates enable row level security;
revoke all on public.internship_certificates from public,anon,authenticated;
grant select on public.internship_certificates to authenticated;
grant all on public.internship_certificates to service_role;
create policy certificates_read on public.internship_certificates for select to authenticated using(private.can_read_application(application_id));

create function public.issue_internship_certificate(completion uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.internship_completions; result uuid;
begin
 select * into c from public.internship_completions where id=completion for update;
 if auth.uid() is null or c.id is null or not private.owns_application_opportunity(c.application_id) then raise exception 'Only the opportunity owner can issue a reviewed completion certificate'; end if;
 if not exists(select 1 from public.applications where id=c.application_id and status='Completed') then raise exception 'A reviewed completed internship is required'; end if;
 select id into result from public.internship_certificates where completion_id=c.id;
 if found then return result; end if;
 if not exists(select 1 from public.profiles where id=c.applicant_id and nullif(trim(full_name),'') is not null) then raise exception 'The applicant must save their name before certificate issuance'; end if;
 insert into public.internship_certificates(completion_id,application_id,issued_by,recipient_name,issuer_name,title,organization,start_on,end_on,completed_at,report_id,industry_reviewer,faculty_reviewer)
 select c.id,c.application_id,auth.uid(),trim(p.full_name),c.confirmed_name,c.title,c.organization,c.start_on,c.end_on,c.created_at,c.report_id,ir.reviewer_name,fr.reviewer_name
 from public.profiles p join public.internship_report_reviews ir on ir.id=c.industry_review_id
 left join public.internship_report_reviews fr on fr.id=c.faculty_review_id where p.id=c.applicant_id returning id into result;
 return result;
end $$;
create function public.revoke_internship_certificate(certificate uuid, reason text) returns void language plpgsql security definer set search_path='' as $$
declare c public.internship_certificates;
begin
 select * into c from public.internship_certificates where id=certificate for update;
 if auth.uid() is null or c.id is null or not private.owns_application_opportunity(c.application_id) then raise exception 'Only the opportunity owner can revoke this certificate'; end if;
 if c.revoked_at is not null then return; end if;
 if reason is null or length(trim(reason)) not between 10 and 1000 then raise exception 'Provide a revocation reason of 10–1000 characters'; end if;
 update public.internship_certificates set revoked_at=now(),revoked_by=auth.uid(),revocation_reason=trim(reason) where id=c.id;
end $$;
revoke all on function public.issue_internship_certificate(uuid),public.revoke_internship_certificate(uuid,text) from public,anon;
grant execute on function public.issue_internship_certificate(uuid),public.revoke_internship_certificate(uuid,text) to authenticated;
commit;
