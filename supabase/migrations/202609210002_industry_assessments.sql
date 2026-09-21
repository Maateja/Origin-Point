-- Apply after 202609210001_real_platform.sql. No seed data.
begin;
create table public.industry_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  opportunity_id uuid not null references public.opportunities(id),
  title text not null check(length(trim(title)) between 4 and 160),
  summary text not null check(length(trim(summary)) between 20 and 4000),
  status text not null check(status in ('Draft','Published')),
  version integer not null default 1 check(version > 0),
  supersedes uuid references public.industry_assessments(id),
  passing_score integer not null check(passing_score between 1 and 100),
  question_count integer not null check(question_count between 1 and 30),
  approved_by uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status='Draft' and approved_by is null and published_at is null) or
         (status='Published' and approved_by=owner_id and published_at is not null))
);
create index industry_assessments_owner_idx on public.industry_assessments(owner_id);
create index industry_assessments_opportunity_idx on public.industry_assessments(opportunity_id);
create unique index industry_assessments_successor_idx on public.industry_assessments(supersedes) where supersedes is not null;
create index industry_assessments_approver_idx on public.industry_assessments(approved_by);
alter table public.industry_assessments enable row level security;
create policy industry_assessments_read on public.industry_assessments for select to authenticated using(status='Published' or owner_id=(select auth.uid()));
revoke all on public.industry_assessments from anon,authenticated;
grant select on public.industry_assessments to authenticated;
grant all on public.industry_assessments to service_role;

-- Answer keys are outside the exposed schema and are never client-selectable.
create table private.industry_assessment_content (
  assessment_id uuid primary key references public.industry_assessments(id) on delete cascade,
  questions jsonb not null
);
revoke all on private.industry_assessment_content from public,anon,authenticated;

alter table public.assessment_attempts
  add column industry_assessment_id uuid references public.industry_assessments(id),
  add column pass_threshold integer not null default 70 check(pass_threshold between 1 and 100);
create unique index industry_assessment_one_attempt_idx on public.assessment_attempts(user_id,industry_assessment_id) where industry_assessment_id is not null;
create index attempts_industry_assessment_idx on public.assessment_attempts(industry_assessment_id);

create function public.save_industry_assessment(definition jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare person uuid := auth.uid(); assessment uuid; previous uuid; current_row public.industry_assessments;
  opportunity uuid; questions jsonb; q jsonb; option_value jsonb; publish boolean; version_number integer:=1;
begin
  -- Serializes author saves and version creation, without trusting caller identity.
  perform 1 from public.profiles where id=person and role='industry' for update;
  if not found then raise exception 'Only industry accounts can author assessments'; end if;
  assessment := nullif(definition->>'id','')::uuid;
  previous := nullif(definition->>'supersedes','')::uuid;
  opportunity := (definition->>'opportunity_id')::uuid;
  publish := coalesce((definition->>'publish')::boolean,false);
  perform 1 from public.opportunities where id=opportunity and owner_id=person;
  if not found then raise exception 'Choose an opportunity owned by your account'; end if;
  if assessment is not null then
    select * into current_row from public.industry_assessments where id=assessment and owner_id=person for update;
    if not found then raise exception 'Assessment not found'; end if;
    if current_row.status <> 'Draft' then raise exception 'Published assessments are immutable. Create a new version.'; end if;
    previous:=current_row.supersedes; version_number:=current_row.version;
  elsif previous is not null then
    select * into current_row from public.industry_assessments where id=previous and owner_id=person and status='Published';
    if not found or current_row.opportunity_id<>opportunity then raise exception 'Choose your own published assessment for versioning'; end if;
    version_number:=current_row.version+1;
  end if;
  if previous is not null and not exists(select 1 from public.industry_assessments where id=previous and opportunity_id=opportunity) then raise exception 'A revised version must retain its linked opportunity'; end if;
  questions:=definition->'questions';
  if questions is null or jsonb_typeof(questions)<>'array' then raise exception 'Questions must be an array'; end if;
  if jsonb_array_length(questions) not between 1 and 30 then raise exception 'Provide between 1 and 30 questions'; end if;
  for q in select value from jsonb_array_elements(questions) loop
    if jsonb_typeof(q->'correctAnswer') is distinct from 'number' or jsonb_typeof(q->'question') is distinct from 'string' or jsonb_typeof(q->'skillArea') is distinct from 'string' or jsonb_typeof(q->'explanation') is distinct from 'string' then raise exception 'Invalid question field types'; end if;
    if coalesce(length(trim(q->>'question')),0) not between 10 and 2000
      or coalesce(length(trim(q->>'skillArea')),0) not between 2 and 100
      or coalesce(length(trim(q->>'explanation')),0) not between 5 and 3000
      or coalesce(q->>'category','') not in ('Technical','Aptitude','Soft skills')
      or coalesce(q->>'correctAnswer','') not in ('0','1','2','3') then raise exception 'Invalid question or answer key'; end if;
    if q->'options' is null or jsonb_typeof(q->'options')<>'array' then raise exception 'Provide four answer options'; end if;
    if jsonb_array_length(q->'options')<>4 then raise exception 'Provide four answer options'; end if;
    for option_value in select value from jsonb_array_elements(q->'options') loop
      if jsonb_typeof(option_value)<>'string' or length(trim(option_value#>>'{}')) not between 1 and 800 then raise exception 'Invalid option'; end if;
    end loop;
    if (select count(distinct lower(trim(value))) from jsonb_array_elements_text(q->'options'))<>4 then raise exception 'Options must be distinct'; end if;
  end loop;
  -- IDs are assigned by the database, not by the author/client.
  select jsonb_agg(value || jsonb_build_object('id',ordinality) order by ordinality) into questions from jsonb_array_elements(questions) with ordinality;
  if assessment is null then
    insert into public.industry_assessments(owner_id,opportunity_id,title,summary,status,version,supersedes,passing_score,question_count,approved_by,published_at)
    values(person,opportunity,definition->>'title',definition->>'summary',case when publish then 'Published' else 'Draft' end,version_number,previous,(definition->>'passing_score')::integer,jsonb_array_length(questions),case when publish then person end,case when publish then now() end) returning id into assessment;
  else
    update public.industry_assessments set opportunity_id=opportunity,title=definition->>'title',summary=definition->>'summary',passing_score=(definition->>'passing_score')::integer,question_count=jsonb_array_length(questions),status=case when publish then 'Published' else 'Draft' end,approved_by=case when publish then person end,published_at=case when publish then now() end where id=assessment;
  end if;
  insert into private.industry_assessment_content values(assessment,questions) on conflict(assessment_id) do update set questions=excluded.questions;
  return assessment;
end $$;

create function public.industry_assessment_definition(assessment uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  select to_jsonb(a)||jsonb_build_object('questions',c.questions) into result
    from public.industry_assessments a join private.industry_assessment_content c on c.assessment_id=a.id
    where a.id=assessment and a.owner_id=(select auth.uid());
  if result is null then raise exception 'Assessment not found for this author'; end if;
  return result;
end $$;

create function public.start_industry_assessment(assessment uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare person uuid:=auth.uid(); a public.industry_assessments; attempt public.assessment_attempts; questions jsonb; account_role text;
begin
  select role into account_role from public.profiles where id=person for update;
  if account_role is null or account_role<>'student' then raise exception 'Only student accounts can take this assessment'; end if;
  select * into a from public.industry_assessments where id=assessment and status='Published';
  if not found then raise exception 'Published assessment not found'; end if;
  select * into attempt from public.assessment_attempts where user_id=person and industry_assessment_id=assessment;
  if not found then
    if not exists(select 1 from public.opportunities where id=a.opportunity_id and status='Open' and deadline>=(now() at time zone 'Asia/Kolkata')::date and audience in ('student','all')) then raise exception 'This opportunity is not open to students'; end if;
    if exists(select 1 from public.industry_assessments where supersedes=assessment and status='Published') then raise exception 'A newer assessment version is available'; end if;
    select c.questions into questions from private.industry_assessment_content c where c.assessment_id=assessment;
    insert into public.assessment_attempts(user_id,topic_id,topic_title,level_id,level_title,questions,source,industry_assessment_id,pass_threshold)
    values(person,'industry:'||assessment,a.title,'industry','Industry-defined assessment',questions,'Industry-authored / version '||a.version,assessment,a.passing_score) returning * into attempt;
  end if;
  if attempt.submitted_at is not null then return jsonb_build_object('attemptId',attempt.id,'report',attempt.report); end if;
  return jsonb_build_object('attemptId',attempt.id,'topicTitle',a.title,'source',attempt.source,'questions',
    (select jsonb_agg(jsonb_build_object('id',q->'id','question',q->'question','options',q->'options','skillArea',q->'skillArea','category',q->'category')) from jsonb_array_elements(attempt.questions) q));
end $$;

create table public.skill_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  assessment_report_id uuid not null references public.assessment_reports(id) on delete cascade,
  industry_assessment_id uuid not null references public.industry_assessments(id),
  issuer_id uuid not null references public.profiles(id),
  skill text not null,
  score integer not null check(score between 0 and 100),
  threshold integer not null check(threshold between 1 and 100),
  question_count integer not null check(question_count > 0),
  created_at timestamptz not null default now(),
  unique(assessment_report_id,skill)
);
create index skill_evidence_user_idx on public.skill_evidence(user_id);
create index skill_evidence_issuer_idx on public.skill_evidence(issuer_id);
create index skill_evidence_assessment_idx on public.skill_evidence(industry_assessment_id);
alter table public.skill_evidence enable row level security;
create policy skill_evidence_read on public.skill_evidence for select to authenticated using(private.can_read_portfolio(user_id));
revoke all on public.skill_evidence from anon,authenticated;
grant select on public.skill_evidence to authenticated;
grant all on public.skill_evidence to service_role;
create function private.record_industry_skill_evidence() returns trigger language plpgsql security definer set search_path='' as $$
declare a public.industry_assessments; area jsonb;
begin
  select d.* into a from public.industry_assessments d join public.assessment_attempts t on t.industry_assessment_id=d.id where t.id=new.id;
  if found then
    for area in select value from jsonb_array_elements(new.report->'skillBreakdown') loop
      insert into public.skill_evidence(user_id,assessment_report_id,industry_assessment_id,issuer_id,skill,score,threshold,question_count)
      values(new.user_id,new.id,a.id,a.owner_id,area->>'skill',(area->>'score')::integer,a.passing_score,(select count(*) from public.assessment_attempts t cross join lateral jsonb_array_elements(t.questions) q where t.id=new.id and lower(trim(q->>'skillArea'))=lower(trim(area->>'skill'))));
    end loop;
  end if;
  return new;
end $$;
create trigger industry_skill_evidence after insert on public.assessment_reports for each row execute function private.record_industry_skill_evidence();
revoke all on function public.save_industry_assessment(jsonb),public.industry_assessment_definition(uuid),public.start_industry_assessment(uuid) from public,anon;
grant execute on function public.save_industry_assessment(jsonb),public.industry_assessment_definition(uuid),public.start_industry_assessment(uuid) to authenticated;
commit;
