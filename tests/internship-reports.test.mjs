import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
test("private report versions, reviewer scopes, final approvals and immutable completion", async () => {
  const db = await createTestDatabase();
  const student = "11111111-1111-4111-8111-111111111111",
    owner = "22222222-2222-4222-8222-222222222222",
    mentor = "33333333-3333-4333-8333-333333333333",
    institution = "44444444-4444-4444-8444-444444444444",
    faculty = "55555555-5555-4555-8555-555555555555",
    stranger = "66666666-6666-4666-8666-666666666666";
  async function as(id) {
    await db.exec("reset role");
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",
      [id],
    );
    await db.exec("set role authenticated");
  }
  try {
    for (const [id, role] of [
      [student, "student"],
      [owner, "industry"],
      [mentor, "industry"],
      [institution, "institution"],
      [faculty, "academician"],
      [stranger, "student"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: "Test " + role }],
      );
    await as(owner);
    const opportunity = (
      await db.query(
        "insert into opportunities(title,company,type,location,work_mode,duration,deadline,description,seats) values('Report test','Company','Internship','Remote','Remote','1 month',current_date+30,'An internship with evidence based final review',2) returning id",
      )
    ).rows[0].id;
    await as(student);
    const app = (
      await db.query("select apply_to_opportunity($1) id", [opportunity])
    ).rows[0].id;
    await as(owner);
    await db.query("update applications set status='Shortlisted' where id=$1", [
      app,
    ]);
    await db.query("update applications set status='Offered' where id=$1", [
      app,
    ]);
    await db.query(
      "select configure_internship($1,current_date,current_date+30)",
      [app],
    );
    await as(student);
    await db.query("select respond_internship_offer($1,'Accepted')", [app]);
    const paths = [];
    async function submit(kind = "Final") {
      await as(student);
      const path = `${student}/${app}/${crypto.randomUUID()}.pdf`;
      paths.push(path);
      await db.query(
        "insert into storage.objects(bucket_id,name) values('internship-reports',$1)",
        [path],
      );
      return (
        await db.query("select submit_internship_report($1,$2,$3,$4,$5) id", [
          app,
          kind,
          "Evidence report",
          "Documented the implementation and all test results",
          path,
        ])
      ).rows[0].id;
    }
    const first = await submit();
    await assert.rejects(
      db.query(
        "select review_internship_report($1,'Approved','Applicant self approval attempt')",
        [first],
      ),
      /Only the owner/,
    );
    await assert.rejects(
      db.exec("update internship_reports set title='Overwrite'"),
      /permission denied/,
    );
    assert.equal(
      (
        await db.query(
          "delete from storage.objects where name=$1 returning id",
          [paths[0]],
        )
      ).rows.length,
      0,
      "submitted files cannot be deleted",
    );
    await as(stranger);
    for (const table of [
      "internship_reports",
      "internship_report_reviews",
      "internship_completions",
      "storage.objects",
    ])
      assert.equal((await db.query("select * from " + table)).rows.length, 0);
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('internship-reports',$1)",
        [`${stranger}/${app}/fake.pdf`],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query("select complete_reviewed_internship($1)", [app]),
      /Only the opportunity owner/,
    );
    await as(owner);
    await assert.rejects(
      db.query("update applications set status='Completed' where id=$1", [app]),
      /final report review workflow/,
    );
    await assert.rejects(
      db.query("select complete_reviewed_internship($1)", [app]),
      /industry approval/,
    );
    await db.query("select assign_internship_supervisor($1,$2,'Mentor')", [
      app,
      mentor,
    ]);
    await as(mentor);
    assert.equal(
      (await db.query("select * from internship_reports")).rows.length,
      0,
    );
    const invitation = (await db.query("select my_supervision() data")).rows[0]
      .data[0].id;
    await db.query("select respond_supervision($1,'Accepted')", [invitation]);
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      1,
    );
    await db.query(
      "select review_internship_report($1,'Approved','Tested the deliverables and reviewed evidence')",
      [first],
    );
    const latest = await submit();
    await as(owner);
    await assert.rejects(
      db.query("select complete_reviewed_internship($1)", [app]),
      /industry approval/,
    );
    await assert.rejects(
      db.query(
        "select review_internship_report($1,'Approved','Attempting to approve superseded report')",
        [first],
      ),
      /latest version/,
    );
    await as(mentor);
    await db.query(
      "select review_internship_report($1,'Approved','Reviewed updated evidence and confirmed results')",
      [latest],
    );
    await as(owner);
    await db.query("select assign_internship_supervisor($1,null,'Mentor')", [
      app,
    ]);
    await as(mentor);
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
      "revocation removes download access",
    );
    await as(owner);
    await assert.rejects(
      db.query("select complete_reviewed_internship($1)", [app]),
      /current industry reviewer/,
    );
    await db.query(
      "select review_internship_report($1,'Approved','Owner reviewed the updated final report')",
      [latest],
    );
    for (const person of [student, faculty]) {
      await as(person);
      await db.query(
        "insert into institution_memberships(institution_id) values($1)",
        [institution],
      );
    }
    await as(institution);
    await db.exec("update institution_memberships set status='Approved'");
    assert.equal(
      (await db.query("select * from internship_reports")).rows.length,
      2,
    );
    await assert.rejects(
      db.query(
        "select review_internship_report($1,'Approved','Institution cannot impersonate faculty reviewer')",
        [latest],
      ),
      /Only the owner/,
    );
    await db.query("select assign_internship_supervisor($1,$2,'Faculty')", [
      app,
      faculty,
    ]);
    await as(owner);
    await assert.rejects(
      db.query("select complete_reviewed_internship($1)", [app]),
      /faculty supervisor/,
    );
    await as(faculty);
    const fi = (await db.query("select my_supervision() data")).rows[0].data[0]
      .id;
    await db.query("select respond_supervision($1,'Accepted')", [fi]);
    await db.query(
      "select review_internship_report($1,'Changes requested','Please include the final evaluation and references')",
      [latest],
    );
    await as(owner);
    await assert.rejects(
      db.query("select complete_reviewed_internship($1)", [app]),
      /faculty supervisor/,
    );
    await as(faculty);
    await db.query(
      "select review_internship_report($1,'Approved','Final evaluation has been checked and accepted')",
      [latest],
    );
    await as(owner);
    const milestone = (
      await db.query(
        "insert into internship_milestones(application_id,title) values($1,'Final delivery check') returning id",
        [app],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query("select complete_reviewed_internship($1)", [app]),
      /pending milestones/,
    );
    assert.equal(
      (await db.query("select * from internship_completions")).rows.length,
      0,
      "failed completion rolls back its evidence record",
    );
    await as(student);
    await db.query(
      "insert into internship_logs(application_id,milestone_id,week_ending,summary) values($1,$2,current_date,'Completed and documented the final delivery')",
      [app, milestone],
    );
    await as(owner);
    await db.query(
      "update internship_milestones set status='Approved' where id=$1",
      [milestone],
    );
    await db.query("select complete_reviewed_internship($1)", [app]);
    await db.query("select complete_reviewed_internship($1)", [app]);
    assert.equal(
      (await db.query("select * from internship_completions")).rows.length,
      1,
      "completion retries do not duplicate records",
    );
    const completion = (await db.query("select * from internship_completions"))
      .rows[0];
    assert.equal(completion.report_id, latest);
    assert.equal(completion.confirmed_by, owner);
    assert.ok(completion.faculty_review_id);
    await assert.rejects(
      db.exec("update internship_completions set organization='Forged'"),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "select review_internship_report($1,'Changes requested','Trying to change completed records')",
        [latest],
      ),
      /active internship/,
    );
    await as(student);
    assert.equal(
      (await db.query("select * from internship_completions")).rows.length,
      1,
    );
    await assert.rejects(
      db.query(
        "select submit_internship_report($1,'Final','Late revision','Cannot change a completed internship',$2)",
        [app, paths[0]],
      ),
      /active internship/,
    );
    await as(stranger);
    assert.equal(
      (await db.query("select * from internship_completions")).rows.length,
      0,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.exec("select * from internship_reports"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
