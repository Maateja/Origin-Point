-- Curated reference aliases only. No user records are inserted or rewritten.
-- Historical application scores are preserved; new applications use taxonomy v1.
begin;
create function public.skill_key(value text) returns text language sql immutable strict set search_path = '' as $$
  with normalized as (select lower(trim(regexp_replace(value, '\s+', ' ', 'g'))) as key)
  select coalesce((select canonical from (values
      ('react','react'),
      ('react.js','react'),
      ('reactjs','react'),
      ('javascript','javascript'),
      ('js','javascript'),
      ('ecmascript','javascript'),
      ('typescript','typescript'),
      ('ts','typescript'),
      ('node.js','node.js'),
      ('nodejs','node.js'),
      ('node js','node.js'),
      ('next.js','next.js'),
      ('nextjs','next.js'),
      ('next js','next.js'),
      ('postgresql','postgresql'),
      ('postgres','postgresql'),
      ('postgres sql','postgresql'),
      ('python','python'),
      ('sql','sql'),
      ('html','html'),
      ('html5','html'),
      ('css','css'),
      ('css3','css'),
      ('git','git'),
      ('docker','docker'),
      ('kubernetes','kubernetes'),
      ('k8s','kubernetes'),
      ('c++','c++'),
      ('cpp','c++'),
      ('c#','c#'),
      ('csharp','c#'),
      ('c sharp','c#')
  ) aliases(alias,canonical) where alias = normalized.key), normalized.key) from normalized;
$$;
revoke all on function public.skill_key(text) from public, anon;
grant execute on function public.skill_key(text) to authenticated, service_role;
create function public.skill_taxonomy_version() returns integer language sql immutable set search_path = '' as $$ select 1; $$;
revoke all on function public.skill_taxonomy_version() from public, anon;
grant execute on function public.skill_taxonomy_version() to authenticated, service_role;

create or replace function public.apply_to_opportunity(opportunity uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  job public.opportunities;
  person uuid := (select auth.uid());
  account_role text;
  match_value integer;
  application_id uuid;
  active_assessment public.industry_assessments;
  attempt public.assessment_attempts;
  rep jsonb;
  score_val integer := null;
  passed_val boolean := false;
  disqualified_val boolean := false;
  violations_val integer := 0;
  trust_val text := 'Verified';
begin
  if person is null then raise exception 'Sign in to apply'; end if;
  select * into job from public.opportunities where id = opportunity for share;
  if not found then raise exception 'Opportunity not found'; end if;
  select role into account_role from public.profiles where id = person;
  if account_role is null or account_role not in ('student','academician') or (job.audience <> 'all' and job.audience <> account_role) or job.owner_id = person then
    raise exception 'This opportunity is not available to your account';
  end if;
  if job.status <> 'Open' or job.deadline < (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'Applications for this opportunity have closed';
  end if;

  -- If the opportunity requires an assessment, verify test completion
  if job.requires_assessment then
    select * into active_assessment from public.industry_assessments
      where opportunity_id = opportunity and status = 'Published'
      order by version desc limit 1;

    if not found then
      raise exception 'The required screening assessment for this opportunity is being finalized';
    end if;

    select * into attempt from public.assessment_attempts
      where user_id = person and industry_assessment_id = active_assessment.id;

    if not found or attempt.submitted_at is null or attempt.report is null then
      raise exception 'This opportunity requires completing the attached industry assessment before applying';
    end if;

    rep := attempt.report;
    disqualified_val := coalesce((rep->>'disqualified')::boolean, false);
    if disqualified_val then
      raise exception 'Candidates disqualified for proctoring violations cannot apply to this opportunity';
    end if;

    score_val := (rep->>'scorePercent')::integer;
    violations_val := coalesce((rep->>'violationsCount')::integer, 0);
    passed_val := (score_val >= coalesce(job.assessment_cutoff, active_assessment.passing_score, 70));
    if violations_val > 0 then
      trust_val := 'Warnings Recorded';
    else
      trust_val := 'Verified';
    end if;
  end if;

  select case when count(*) = 0 then 0 else round(100.0 * count(*) filter(where exists(select 1 from public.portfolio_records r where r.user_id = person and r.kind = 'skill' and public.skill_key(r.title) = s)) / count(*)) end
  into match_value from (select distinct public.skill_key(s) s from unnest(job.skills) s where public.skill_key(s) <> '') required;

  insert into public.applications(
    opportunity_id,
    applicant_id,
    match_score,
    assessment_report_id,
    assessment_score,
    assessment_passed,
    proctoring_trust,
    proctoring_violations
  )
  values(
    opportunity,
    person,
    match_value,
    attempt.id,
    score_val,
    passed_val,
    trust_val,
    violations_val
  )
  on conflict(opportunity_id, applicant_id) do update set
    match_score = excluded.match_score,
    assessment_report_id = coalesce(excluded.assessment_report_id, applications.assessment_report_id),
    assessment_score = coalesce(excluded.assessment_score, applications.assessment_score),
    assessment_passed = coalesce(excluded.assessment_passed, applications.assessment_passed),
    proctoring_trust = coalesce(excluded.proctoring_trust, applications.proctoring_trust),
    proctoring_violations = coalesce(excluded.proctoring_violations, applications.proctoring_violations),
    updated_at = now()
  returning id into application_id;

  if application_id is null then
    select id into application_id from public.applications where opportunity_id = opportunity and applicant_id = person;
  end if;

  return application_id;
end $$;
create or replace function private.record_industry_skill_evidence() returns trigger language plpgsql security definer set search_path='' as $$
declare a public.industry_assessments; area jsonb;
begin
  select d.* into a from public.industry_assessments d join public.assessment_attempts t on t.industry_assessment_id=d.id where t.id=new.id;
  if found then
    for area in select value from jsonb_array_elements(new.report->'skillBreakdown') loop
      insert into public.skill_evidence(user_id,assessment_report_id,industry_assessment_id,issuer_id,skill,score,threshold,question_count)
      values(new.user_id,new.id,a.id,a.owner_id,area->>'skill',(area->>'score')::integer,a.passing_score,(select count(*) from public.assessment_attempts t cross join lateral jsonb_array_elements(t.questions) q where t.id=new.id and public.skill_key(q->>'skillArea')=public.skill_key(area->>'skill')));
    end loop;
  end if;
  return new;
end $$;
commit;
