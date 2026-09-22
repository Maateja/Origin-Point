import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
test("interview history, private offers, responses and two-party joining are enforced", async () => {
  const db = await createTestDatabase();
  const student = "11111111-1111-4111-8111-111111111111",
    owner = "22222222-2222-4222-8222-222222222222",
    other = "33333333-3333-4333-8333-333333333333",
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
      [owner, "industry"],
      [other, "industry"],
      [institution, "institution"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: role }],
      );
    await as(owner);
    const opp = (
      await db.query(
        "insert into opportunities(title,company,type,location,work_mode,duration,deadline,description,seats) values('Engineering role','Company','Job','Remote','Remote','Full time',current_date+30,'An engineering position with genuine recruitment steps',2) returning id",
      )
    ).rows[0].id;
    await as(student);
    const app = (await db.query("select apply_to_opportunity($1) id", [opp]))
      .rows[0].id;
    await db.query(
      "insert into institution_memberships(institution_id) values($1)",
      [institution],
    );
    await as(owner);
    await db.query("update applications set status='Shortlisted' where id=$1", [
      app,
    ]);
    await db.query(
      "select schedule_application_interview($1,now()+interval '1 day',45,'Video','Meeting link from recruiter','Discuss project experience and technical fundamentals')",
      [app],
    );
    const old = (await db.query("select id from application_interviews"))
      .rows[0].id;
    await as(student);
    await db.query(
      "select respond_application_interview($1,'Reschedule requested','Please move the interview to the next day')",
      [old],
    );
    await as(owner);
    await db.query(
      "select schedule_application_interview($1,now()+interval '2 days',45,'Video','Revised meeting instructions','Bring your project walkthrough and supporting evidence')",
      [app],
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from application_interviews where status='Cancelled'",
        )
      ).rows[0].n,
      1,
    );
    await as(student);
    await assert.rejects(
      db.query("select respond_application_interview($1,'Confirmed','')", [
        old,
      ]),
      /upcoming active/,
    );
    const current = (
      await db.query(
        "select id from application_interviews where status='Scheduled'",
      )
    ).rows[0].id;
    await db.query("select respond_application_interview($1,'Confirmed','')", [
      current,
    ]);
    await as(other);
    assert.equal(
      (await db.query("select * from application_interviews")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "select schedule_application_interview($1,now()+interval '1 day',30,'Phone','Office contact','Interview preparation instructions')",
        [app],
      ),
      /Only the owner/,
    );
    await as(owner);
    await db.query(
      "select issue_placement_offer($1,'INR 600000 fixed annually','Full-time remote role; joining subject to agreed employment documentation',(now() at time zone 'Asia/Kolkata')::date+7,now()+interval '1 day')",
      [app],
    );
    const offer = (await db.query("select id from placement_offers")).rows[0]
      .id;
    await assert.rejects(
      db.query("update applications set status='Completed' where id=$1", [app]),
      /joining confirmation/,
    );
    await assert.rejects(
      db.query("select respond_placement_offer($1,'Accepted')", [offer]),
      /Only the applicant/,
    );
    await as(student);
    await db.query("select respond_placement_offer($1,'Accepted')", [offer]);
    await assert.rejects(
      db.query("select respond_placement_offer($1,'Declined')", [offer]),
      /pending offer/,
    );
    await assert.rejects(
      db.query("select record_placement_joining($1)", [offer]),
      /reached joining date/,
    );
    await as(owner);
    await assert.rejects(
      db.query("select withdraw_placement_offer($1)", [offer]),
      /pending offer/,
    );
    await assert.rejects(
      db.exec("update placement_offers set compensation='Forged terms'"),
      /permission denied/,
    );
    // Advance the joining date in the disposable fixture, never in the live app.
    await db.exec("reset role");
    await db.query(
      "update placement_offers set joining_on=(now() at time zone 'Asia/Kolkata')::date where id=$1",
      [offer],
    );
    await as(student);
    await assert.rejects(
      db.query("select record_placement_joining($1)", [offer]),
      /employer must report/,
    );
    await as(owner);
    await db.query("select record_placement_joining($1)", [offer]);
    assert.equal(
      (await db.query("select status from applications")).rows[0].status,
      "Offered",
    );
    await as(student);
    await db.query("select record_placement_joining($1)", [offer]);
    await db.query("select record_placement_joining($1)", [offer]);
    assert.equal(
      (await db.query("select status from applications")).rows[0].status,
      "Completed",
    );
    await as(institution);
    assert.equal(
      (await db.query("select * from placement_offers")).rows.length,
      0,
    );
    await db.exec("update institution_memberships set status='Approved'");
    assert.equal(
      (await db.query("select * from placement_offers")).rows.length,
      1,
    );
    await assert.rejects(
      db.query("select record_placement_joining($1)", [offer]),
      /Only the employer or applicant/,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.exec("select * from placement_offers"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
