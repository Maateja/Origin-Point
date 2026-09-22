import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTestDatabase,
  completeTestInternship,
} from "./database-fixture.mjs";
test("application timeline and internships preserve ownership and shared history", async () => {
  const db = await createTestDatabase();
  const student = "11111111-1111-4111-8111-111111111111",
    other = "22222222-2222-4222-8222-222222222222",
    employer = "33333333-3333-4333-8333-333333333333",
    institution = "44444444-4444-4444-8444-444444444444";
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
      [other, "student"],
      [employer, "industry"],
      [institution, "institution"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: role }],
      );
    await as(employer);
    const opportunity = (
      await db.query(
        "insert into opportunities(title,company,type,location,work_mode,duration,deadline,description,seats) values('Software internship','Company','Internship','Remote','Remote','3 months',current_date+30,'Build and test production software with a team',2) returning id",
      )
    ).rows[0].id;
    await as(student);
    const application = (
      await db.query("select apply_to_opportunity($1) id", [opportunity])
    ).rows[0].id;
    assert.equal(
      (await db.query("select * from application_events")).rows.length,
      1,
    );
    await assert.rejects(
      db.exec("delete from application_events"),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "insert into internship_logs(application_id,week_ending,summary) values($1,current_date,'Worked on the interface')",
        [application],
      ),
      /row-level security/,
    );
    await db.query(
      "insert into institution_memberships(institution_id,member_id) values($1,$2)",
      [institution, student],
    );
    await as(employer);
    await db.query("update applications set status='Shortlisted' where id=$1", [
      application,
    ]);
    await db.query(
      "update applications set status='Offered',next_step='Coordinate the start date',feedback='Offer ready' where id=$1",
      [application],
    );
    assert.equal(
      (await db.query("select * from application_events")).rows.length,
      3,
    );
    await db.query(
      "update applications set feedback='Offer ready' where id=$1",
      [application],
    );
    assert.equal(
      (await db.query("select * from application_events")).rows.length,
      3,
      "no-op updates do not fabricate events",
    );
    await db.query(
      "select configure_internship($1,current_date,current_date+30)",
      [application],
    );
    await as(student);
    await db.query("select respond_internship_offer($1,'Accepted')", [
      application,
    ]);
    await as(employer);
    const milestone = (
      await db.query(
        "insert into internship_milestones(application_id,title) values($1,'Deliver first feature') returning id",
        [application],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query(
        "update internship_milestones set status='Approved' where id=$1",
        [milestone],
      ),
      /submit a log/,
    );
    await as(student);
    await assert.rejects(
      db.query(
        "insert into internship_milestones(application_id,title) values($1,'Self approval')",
        [application],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "insert into internship_logs(application_id,milestone_id,week_ending,summary) values($1,'99999999-9999-4999-8999-999999999999',current_date,'Unrelated milestone report')",
        [application],
      ),
      /another internship/,
    );
    await assert.rejects(
      db.query(
        "insert into internship_logs(application_id,week_ending,summary) values($1,current_date+3,'Future progress report')",
        [application],
      ),
      /future/,
    );
    await db.query(
      "insert into internship_logs(application_id,milestone_id,week_ending,summary,evidence_url) values($1,$2,current_date,'Implemented and tested the assigned interface','https://example.test/work')",
      [application, milestone],
    );
    assert.equal(
      (
        await db.query(
          "update internship_milestones set status='Approved' where id=$1 returning id",
          [milestone],
        )
      ).rows.length,
      0,
    );
    await as(other);
    for (const table of [
      "application_events",
      "internship_milestones",
      "internship_logs",
    ])
      assert.equal((await db.query("select * from " + table)).rows.length, 0);
    await assert.rejects(
      db.query(
        "insert into internship_logs(application_id,week_ending,summary) values($1,current_date,'Forged progress report')",
        [application],
      ),
      /row-level security/,
    );
    await as(institution);
    assert.equal(
      (await db.query("select * from internship_logs")).rows.length,
      0,
    );
    await db.query(
      "update institution_memberships set status='Approved' where member_id=$1",
      [student],
    );
    assert.equal(
      (await db.query("select * from internship_logs")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from application_events")).rows.length,
      5,
    );
    assert.equal(
      (
        await db.query(
          "update internship_milestones set status='Approved' where id=$1 returning id",
          [milestone],
        )
      ).rows.length,
      0,
    );
    await as(employer);
    await db.query(
      "update internship_milestones set status='Approved',feedback='Reviewed and accepted' where id=$1",
      [milestone],
    );
    assert.ok(
      (await db.query("select reviewed_at from internship_milestones")).rows[0]
        .reviewed_at,
    );
    await completeTestInternship(db, application);
    assert.equal(
      (await db.query("select * from application_events")).rows.length,
      6,
    );
    await assert.rejects(
      db.query(
        "insert into internship_milestones(application_id,title) values($1,'Late milestone')",
        [application],
      ),
      /row-level security/,
    );
    await as(student);
    await assert.rejects(
      db.query(
        "insert into internship_logs(application_id,week_ending,summary) values($1,current_date,'Late progress report')",
        [application],
      ),
      /row-level security/,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.exec("select * from application_events"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
