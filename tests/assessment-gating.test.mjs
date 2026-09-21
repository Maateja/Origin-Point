import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";

test("assessment-gated hiring: enforces exam completion and auto-shortlisting", async () => {
  const db = await createTestDatabase();
  try {
    const industryId = "11111111-1111-4111-8111-111111111111";
    const studentId = "22222222-2222-4222-8222-222222222222";
    const opportunityId = "33333333-3333-4333-8333-333333333333";

    async function as(id, role = "authenticated") {
      await db.exec("reset role");
      await db.query(
        "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",
        [id, role],
      );
      await db.exec("set role " + role);
    }

    // Setup industry and student accounts
    await db.query(
      "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
      [industryId, "recruiter@techcorp.com", { full_name: "TechCorp Recruiter", role: "industry" }],
    );
    await db.query(
      "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
      [studentId, "candidate@university.edu", { full_name: "Alex Student", role: "student" }],
    );

    // Industry creates opportunity with requires_assessment = true
    await as(industryId);
    await db.query(`
      insert into public.opportunities (
        id, owner_id, title, company, type, audience, location, work_mode, duration, stipend, deadline, skills, description, seats, requires_assessment, assessment_cutoff
      ) values (
        '${opportunityId}', '${industryId}', 'Frontend Engineer Intern', 'TechCorp', 'Internship', 'student', 'Remote', 'Remote', '3 months', '30000', ((now() at time zone 'Asia/Kolkata') + interval '10 days')::date, array['React', 'TypeScript'], 'Build scalable frontend applications with Next.js and TailwindCSS.', 5, true, 70
      );
    `);

    // Industry authors and publishes an assessment linked to this opportunity
    const assessmentRes = await db.query(`
      select public.save_industry_assessment(
        jsonb_build_object(
          'title', 'Frontend Competency Screening',
          'summary', '15-minute proctored assessment evaluating React & TypeScript skills.',
          'opportunity_id', '${opportunityId}',
          'passing_score', 70,
          'publish', true,
          'questions', jsonb_build_array(
            jsonb_build_object(
              'question', 'What does the useEffect hook do in React components?',
              'options', jsonb_build_array('Executes side effects', 'Updates global store', 'Declares routing', 'Defines schemas'),
              'correctAnswer', 0,
              'explanation', 'useEffect manages component lifecycles and side effects.',
              'skillArea', 'React',
              'category', 'Technical'
            )
          )
        )
      ) as id;
    `);
    const assessmentId = assessmentRes.rows[0].id;

    // Student attempts to apply without taking the assessment -> MUST FAIL
    await as(studentId);

    await assert.rejects(
      async () => {
        await db.query(`select public.apply_to_opportunity('${opportunityId}');`);
      },
      (err) => {
        assert.match(err.message, /requires completing the attached industry assessment/i);
        return true;
      }
    );

    // Student starts and takes the assessment
    const started = (
      await db.query("select public.start_industry_assessment($1) result", [assessmentId])
    ).rows[0].result;
    const attemptId = started.attemptId;

    // Finish assessment with 100% score and 0 violations
    await as(null, "service_role");
    await db.query(`
      select public.finish_assessment(
        '${attemptId}',
        jsonb_build_object(
          'scorePercent', 100,
          'disqualified', false,
          'violationsCount', 0,
          'passed', true
        )
      );
    `);

    // Student applies now -> MUST SUCCEED and populate verified test scores
    await as(studentId);
    await db.query(`select public.apply_to_opportunity('${opportunityId}');`);

    // Verify application record has verified test score & clean proctoring
    const appRes = await db.query(`
      select assessment_score, assessment_passed, proctoring_trust, proctoring_violations, status
      from public.applications
      where opportunity_id = '${opportunityId}' and applicant_id = '${studentId}';
    `);

    assert.equal(appRes.rows[0].assessment_score, 100);
    assert.equal(appRes.rows[0].assessment_passed, true);
    assert.equal(appRes.rows[0].proctoring_trust, 'Verified');
    assert.equal(appRes.rows[0].proctoring_violations, 0);
    assert.equal(appRes.rows[0].status, 'Applied');

    // Recruiter auto-shortlists qualified candidates
    await as(industryId);
    await db.query(`select public.auto_shortlist_candidates('${opportunityId}', 70);`);

    const updatedApp = await db.query(`
      select status, next_step from public.applications
      where opportunity_id = '${opportunityId}' and applicant_id = '${studentId}';
    `);
    assert.equal(updatedApp.rows[0].status, 'Shortlisted');
    assert.match(updatedApp.rows[0].next_step, /Shortlisted based on verified assessment performance/i);

  } finally {
    await db.close();
  }
});
