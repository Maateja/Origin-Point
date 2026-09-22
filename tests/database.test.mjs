import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTestDatabase,
  completeTestInternship,
} from "./database-fixture.mjs";

test("migration, account isolation, applications, documents and assessment integrity", async () => {
  const db = await createTestDatabase();
  try {
    const student = "11111111-1111-4111-8111-111111111111",
      other = "22222222-2222-4222-8222-222222222222";
    const industry = "33333333-3333-4333-8333-333333333333",
      institution = "44444444-4444-4444-8444-444444444444";
    const faculty = "55555555-5555-4555-8555-555555555555";
    for (const [id, role] of [
      [student, "student"],
      [other, "student"],
      [industry, "industry"],
      [institution, "institution"],
      [faculty, "academician"],
    ]) {
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, role + "@example.test", { full_name: "Test " + role, role }],
      );
    }
    async function as(id, role = "authenticated") {
      await db.exec("reset role");
      await db.query(
        "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",
        [id, role],
      );
      await db.exec("set role " + role);
    }
    await as(student);
    assert.equal(
      (await db.query("select * from profiles")).rows.length,
      1,
      "profiles are private",
    );
    await assert.rejects(
      db.query("update profiles set role='industry' where id=$1", [student]),
      /cannot be changed/,
    );
    await db.query(
      "insert into portfolio_records(kind,title) values('skill','React'),('skill','SQL')",
    );
    await assert.rejects(
      db.query(
        "insert into portfolio_records(kind,title,verified_at) values('certification','Fake verification',now())",
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "insert into portfolio_records(user_id,kind,title) values($1,'skill','Spoof')",
        [other],
      ),
      /row-level security/,
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('portfolio-documents',$1)",
      [student + "/doc.pdf"],
    );
    await db.query(
      "insert into portfolio_records(kind,title,document_path) values('document','Resume',$1)",
      [student + "/doc.pdf"],
    );
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('portfolio-documents',$1)",
        [other + "/spoof.pdf"],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query("select * from assessment_attempts"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select finish_assessment(gen_random_uuid(),'{}')"),
      /permission denied/,
    );

    await as(industry);
    const opportunity = (
      await db.query(`insert into opportunities(title,company,type,audience,location,work_mode,duration,deadline,skills,description,seats)
      values('Real requirement test','Test organization','Internship','student','Remote','Remote','12 weeks',current_date+30,array['React',' react ','Python',''],'A sufficiently detailed real opportunity brief.',2) returning id`)
    ).rows[0].id;
    assert.equal(
      (await db.query("select * from portfolio_records")).rows.length,
      0,
      "unrelated recruiter cannot read private records",
    );
    await assert.rejects(
      db.query("select apply_to_opportunity($1)", [opportunity]),
      /not available/,
    );
    await as(faculty);
    await assert.rejects(
      db.query("select apply_to_opportunity($1)", [opportunity]),
      /not available/,
      "faculty cannot apply to student-only openings",
    );
    await as(student);
    const application = (
      await db.query("select apply_to_opportunity($1) id", [opportunity])
    ).rows[0].id;
    assert.equal(
      (await db.query("select apply_to_opportunity($1) id", [opportunity]))
        .rows[0].id,
      application,
      "retry does not duplicate applications",
    );
    assert.equal(
      (await db.query("select match_score from applications")).rows[0]
        .match_score,
      50,
      "score derived from real saved skills",
    );
    assert.equal(
      (await db.query("update applications set status='Offered' returning id"))
        .rows.length,
      0,
      "student cannot decide application",
    );
    await as(other);
    assert.equal(
      (await db.query("select * from applications")).rows.length,
      0,
      "other students cannot see application",
    );
    assert.equal(
      (await db.query("select * from portfolio_records")).rows.length,
      0,
      "other students cannot see records",
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
      "private documents remain scoped",
    );
    await as(industry);
    assert.equal((await db.query("select * from applications")).rows.length, 1);
    assert.equal(
      (await db.query("select * from portfolio_records")).rows.length,
      3,
      "application shares real portfolio with owner",
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      1,
      "recruiter can open applicant evidence",
    );
    await assert.rejects(
      db.query("update applications set applicant_id=$1", [other]),
      /permission denied/,
    );
    await assert.rejects(
      db.query("update applications set status='Completed'"),
      /Invalid application stage/,
    );
    for (const stage of [
      "Under Review",
      "Shortlisted",
      "Interview Scheduled",
      "Offered",
      "Completed",
    ]) {
      if (stage === "Completed") await completeTestInternship(db, application);
      else await db.query("update applications set status=$1", [stage]);
      if (stage === "Offered") {
        await db.query(
          "select configure_internship($1,current_date,current_date+30)",
          [application],
        );
        await as(student);
        await db.query("select respond_internship_offer($1,'Accepted')", [
          application,
        ]);
        await as(industry);
      }
    }
    await as(student);
    await db.query(
      "insert into institution_memberships(institution_id) values($1)",
      [institution],
    );
    await assert.rejects(
      db.query(
        "insert into institution_memberships(institution_id,status) values($1,'Approved')",
        [industry],
      ),
      /registered institution|row-level security/,
    );
    await as(institution);
    assert.equal(
      (await db.query("select * from applications")).rows.length,
      0,
      "pending membership grants no analytics",
    );
    await db.query("update institution_memberships set status='Approved'");
    assert.equal(
      (await db.query("select * from applications")).rows.length,
      1,
      "approved membership grants scoped analytics",
    );
    assert.equal(
      (await db.query("select * from profiles")).rows.length,
      1,
      "institution still cannot read private emails",
    );
    const directory = (await db.query("select platform_directory() people"))
      .rows[0].people;
    assert.ok(
      directory.every((p) => !("email" in p)),
      "directory omits private email",
    );

    await as(student, "service_role");
    const attempt = (
      await db.query(
        `insert into assessment_attempts(user_id,topic_id,topic_title,level_id,level_title,questions,source) values($1,'web-dev','Web','beginner','Beginner','[]','test') returning id`,
        [student],
      )
    ).rows[0].id;
    const result = { id: attempt, scorePercent: 80 };
    await db.query("select finish_assessment($1,$2)", [attempt, result]);
    await db.query("select finish_assessment($1,$2)", [
      attempt,
      { id: attempt, scorePercent: 100 },
    ]);
    assert.equal(
      (
        await db.query("select score from assessment_reports where id=$1", [
          attempt,
        ])
      ).rows[0].score,
      80,
      "submitted result cannot be overwritten by retries",
    );
    await as(student);
    assert.equal(
      (await db.query("select * from assessment_reports")).rows.length,
      1,
    );
    await assert.rejects(
      db.query(
        "insert into assessment_reports(id,user_id,report,score) values(gen_random_uuid(),$1,'{}',100)",
        [student],
      ),
      /permission denied/,
    );
    await as(other);
    assert.equal(
      (await db.query("select * from assessment_reports")).rows.length,
      0,
    );
    await as(institution);
    assert.equal(
      (await db.query("select * from assessment_reports")).rows.length,
      1,
    );
    await as(industry);
    assert.equal(
      (await db.query("select * from assessment_reports")).rows.length,
      0,
      "recruiter does not get raw private assessments",
    );
    await as(student, "service_role");
    const courseAttempt = (
      await db.query(
        "insert into assessment_attempts(user_id,topic_id,topic_title,level_id,level_title,questions,source,course_id,module_id,subtopic_id) values($1,'st1','Topic','beginner','Beginner','[]','test','c1','m1','st1') returning id",
        [student],
      )
    ).rows[0].id;
    await db.query("select finish_assessment($1,$2)", [
      courseAttempt,
      { id: courseAttempt, scorePercent: 60 },
    ]);
    await db.query("select finish_assessment($1,$2)", [
      courseAttempt,
      { id: courseAttempt, scorePercent: 100 },
    ]);
    await as(student);
    assert.equal(
      (await db.query("select * from learning_progress")).rows[0].score,
      60,
      "only the submitted subtopic is persisted and retries cannot forge completion",
    );
    assert.equal(
      (await db.query("select * from learning_progress")).rows.length,
      1,
    );
    await as(other);
    assert.equal(
      (await db.query("select * from learning_progress")).rows.length,
      0,
      "learning progress stays account-scoped",
    );
    await as(institution);
    assert.equal(
      (await db.query("select * from learning_progress")).rows.length,
      1,
      "approved institution can view member learning",
    );
    await as(student, "service_role");
    for (let i = 1; i <= 6; i++)
      assert.equal(
        (await db.query("select consume_auth_request('hash') allowed")).rows[0]
          .allowed,
        i <= 5,
      );
    await as(student);
    await assert.rejects(
      db.query("select consume_auth_request('hash')"),
      /permission denied/,
    );
    await as(faculty);
    await db.query(
      "insert into portfolio_records(kind,title) values('certification','Faculty qualification')",
    );
    assert.equal(
      (await db.query("select * from portfolio_records")).rows.length,
      1,
      "faculty has its own credentials",
    );
  } finally {
    await db.close();
  }
});
