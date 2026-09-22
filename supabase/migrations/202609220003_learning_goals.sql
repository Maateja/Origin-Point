-- Real student-owned learning plans. No seeded goals or claimed completions.
begin;
create table public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  skill text not null check (length(trim(skill)) between 1 and 160),
  target_id uuid references public.opportunities(id),
  resource_id uuid references public.opportunities(id),
  status text not null default 'Planned' check (status in ('Planned','In progress','Completed')),
  due_on date,
  notes text not null default '' check (length(notes) <= 4000),
  evidence_url text not null default '' check (length(evidence_url) <= 2000 and (evidence_url = '' or evidence_url ~ '^https?://')),
  archived boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index learning_goal_active_skill on public.learning_goals(user_id, public.skill_key(skill), coalesce(target_id,'00000000-0000-0000-0000-000000000000'::uuid)) where not archived;
create index learning_goals_user_idx on public.learning_goals(user_id);
alter table public.learning_goals enable row level security;
create policy learning_goal_read on public.learning_goals for select to authenticated using(user_id = (select auth.uid()) or private.is_institution_member(user_id));
create policy learning_goal_insert on public.learning_goals for insert to authenticated with check(user_id = (select auth.uid()) and private.current_role() = 'student');
create policy learning_goal_update on public.learning_goals for update to authenticated using(user_id = (select auth.uid()) and private.current_role() = 'student') with check(user_id = (select auth.uid()) and private.current_role() = 'student');
revoke all on public.learning_goals from anon, authenticated;
grant select on public.learning_goals to authenticated;
grant insert(skill,target_id,resource_id,due_on,notes,evidence_url) on public.learning_goals to authenticated;
grant update(resource_id,status,due_on,notes,evidence_url,archived) on public.learning_goals to authenticated;
grant all on public.learning_goals to service_role;

create function private.validate_learning_goal() returns trigger language plpgsql set search_path='' as $$
declare resource public.opportunities;
begin
  new.skill := trim(new.skill);
  if tg_op = 'INSERT' and new.target_id is not null then
    if not exists(select 1 from public.opportunities o where o.id=new.target_id and o.audience in ('student','all') and exists(select 1 from unnest(o.skills) s where public.skill_key(s)=public.skill_key(new.skill))) then
      raise exception 'Choose a student opportunity that requires this skill';
    end if;
  end if;
  if new.resource_id is not null and (tg_op = 'INSERT' or new.resource_id is distinct from old.resource_id) then
    select * into resource from public.opportunities where id=new.resource_id;
    if not found or resource.type not in ('Training','Workshop','Mentorship') or resource.audience not in ('student','all') or resource.status <> 'Open' or resource.deadline < (now() at time zone 'Asia/Kolkata')::date or not exists(select 1 from unnest(resource.skills) s where public.skill_key(s)=public.skill_key(new.skill)) then
      raise exception 'Choose an open student learning programme matching this skill';
    end if;
  end if;
  if new.status = 'Completed' and length(trim(new.notes)) = 0 then raise exception 'Add a completion reflection before marking this goal complete'; end if;
  new.completed_at := case when new.status='Completed' then coalesce(old.completed_at, now()) else null end;
  new.updated_at := now();
  return new;
end $$;
create trigger learning_goal_validation before insert or update on public.learning_goals for each row execute function private.validate_learning_goal();
commit;
