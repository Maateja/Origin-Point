-- Apply after 202609210002_industry_assessments.sql
begin;

-- Add assessment gating columns to opportunities
alter table public.opportunities
  add column if not exists requires_assessment boolean not null default false,
  add column if not exists assessment_cutoff integer not null default 70 check (assessment_cutoff between 1 and 100);

-- Add assessment & proctoring verification columns to applications
alter table public.applications
  add column if not exists assessment_report_id uuid references public.assessment_reports(id) on delete set null,
  add column if not exists assessment_score integer check (assessment_score between 0 and 100),
  add column if not exists assessment_passed boolean not null default false,
  add column if not exists proctoring_trust text not null default 'Verified' check (proctoring_trust in ('Verified', 'Warnings Recorded', 'Disqualified')),
  add column if not exists proctoring_violations integer not null default 0 check (proctoring_violations >= 0);

-- Ensure authenticated can select these columns
grant select on public.opportunities to authenticated;
grant select on public.applications to authenticated;
grant update(status, next_step, feedback, progress) on public.applications to authenticated;

-- Replace apply_to_opportunity with assessment-aware logic
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

  select case when count(*) = 0 then 0 else round(100.0 * count(*) filter(where exists(select 1 from public.portfolio_records r where r.user_id = person and r.kind = 'skill' and lower(trim(r.title)) = lower(trim(s)))) / count(*)) end
  into match_value from (select distinct lower(trim(s)) s from unnest(job.skills) s where trim(s) <> '') required;

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

-- Batch auto-shortlist RPC for recruiters
create or replace function public.auto_shortlist_candidates(opportunity_id uuid, min_score integer default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  updated_count integer := 0;
  job public.opportunities;
  target_cutoff integer;
begin
  if caller is null then raise exception 'Sign in required'; end if;
  select * into job from public.opportunities where id = opportunity_id and owner_id = caller;
  if not found then raise exception 'Opportunity not found or not owned by your account'; end if;

  target_cutoff := coalesce(min_score, job.assessment_cutoff, 70);

  update public.applications
    set status = 'Shortlisted',
        next_step = 'Shortlisted based on verified assessment performance',
        feedback = 'Congratulations! Your proctored assessment score met the required benchmark.',
        updated_at = now()
    where public.applications.opportunity_id = auto_shortlist_candidates.opportunity_id
      and status in ('Applied', 'Under Review')
      and (
        (job.requires_assessment and assessment_score >= target_cutoff and proctoring_trust = 'Verified')
        or (not job.requires_assessment and match_score >= target_cutoff)
      );

  get diagnostics updated_count = row_count;
  return updated_count;
end $$;

grant execute on function public.apply_to_opportunity(uuid) to authenticated;
grant execute on function public.auto_shortlist_candidates(uuid, integer) to authenticated;

commit;
