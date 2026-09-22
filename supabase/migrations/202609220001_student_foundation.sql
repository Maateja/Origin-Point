-- Additive student foundation. Uses existing portfolio sharing and ownership.
begin;
alter table public.profiles
  add column preferred_roles text[] not null default '{}',
  add column preferred_locations text[] not null default '{}',
  add column preferred_work_modes text[] not null default '{}',
  add column available_from date,
  add constraint preferred_roles_bound check (cardinality(preferred_roles) <= 20 and length(array_to_string(preferred_roles, ',')) <= 2000 and array_position(preferred_roles, null) is null),
  add constraint preferred_locations_bound check (cardinality(preferred_locations) <= 20 and length(array_to_string(preferred_locations, ',')) <= 2000 and array_position(preferred_locations, null) is null),
  add constraint preferred_modes_valid check (preferred_work_modes <@ array['Remote','Hybrid','On-site']::text[] and cardinality(preferred_work_modes) <= 3 and array_position(preferred_work_modes, null) is null);
grant update(preferred_roles,preferred_locations,preferred_work_modes,available_from) on public.profiles to authenticated;

alter table public.portfolio_records
  add column proficiency text not null default '' check (proficiency in ('','Beginner','Intermediate','Advanced')),
  add column associated_skills text[] not null default '{}' check (cardinality(associated_skills) <= 20 and length(array_to_string(associated_skills, ',')) <= 2000 and array_position(associated_skills, null) is null),
  add column credential_id text not null default '' check (length(credential_id) <= 200),
  add column contribution text not null default '' check (length(contribution) <= 2000);

-- Owners may correct unverified records, but cannot edit identity, attachments,
-- timestamps or verification. Verified records stay immutable to their owner.
grant update(title,organization,description,url,issued_on,expires_on,proficiency,associated_skills,credential_id,contribution) on public.portfolio_records to authenticated;
create policy portfolio_update_unverified on public.portfolio_records for update to authenticated
  using (user_id = (select auth.uid()) and verified_at is null)
  with check (user_id = (select auth.uid()) and verified_at is null);

-- Career preferences are available to the student, their actual recruiters,
-- and approved institutions, not to the general discoverable directory.
create or replace function public.platform_directory() returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'full_name',p.full_name,'role',p.role,'organization',p.organization,'headline',p.headline,
    'department',p.department,'program',p.program,'location',p.location,'bio',p.bio,'website',p.website,
    'skills',coalesce((select jsonb_agg(r.title) from public.portfolio_records r where r.user_id=p.id and r.kind='skill'),'[]'::jsonb)
  ) || case when p.id = (select auth.uid()) or private.is_applicant(p.id) or private.is_institution_member(p.id)
    then jsonb_build_object('preferred_roles',p.preferred_roles,'preferred_locations',p.preferred_locations,'preferred_work_modes',p.preferred_work_modes,'available_from',p.available_from,'graduation_year',p.graduation_year)
    else '{}'::jsonb end),'[]'::jsonb)
  from public.profiles p where (select auth.uid()) is not null and (
    p.id = (select auth.uid()) or p.role in ('industry','institution') or p.discoverable
    or private.is_applicant(p.id) or private.is_institution_member(p.id)
    or exists(select 1 from public.institution_memberships m where m.institution_id = (select auth.uid()) and m.member_id = p.id)
  );
$$;
commit;
