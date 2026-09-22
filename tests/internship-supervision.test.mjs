import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTestDatabase,
  completeTestInternship,
} from "./database-fixture.mjs";

test("offer responses and scoped supervision enforce consent, membership and completion", async () => {
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
      [stranger, "industry"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: role }],
      );
    await as(student);
    await db.exec(
      "insert into portfolio_records(kind,title) values('skill','Private student skill')",
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
    async function offered() {
      await as(owner);
      const opportunity = (
        await db.query(
          "insert into opportunities(title,company,type,location,work_mode,duration,deadline,description,seats) values('Internship opportunity','Company','Internship','Remote','Remote','1 month',current_date+30,'A practical internship with reviewed project milestones',2) returning id",
        )
      ).rows[0].id;
      await as(student);
      const app = (
        await db.query("select apply_to_opportunity($1) id", [opportunity])
      ).rows[0].id;
      await as(owner);
      await db.query(
        "update applications set status='Shortlisted' where id=$1",
        [app],
      );
      await db.query("update applications set status='Offered' where id=$1", [
        app,
      ]);
      return app;
    }
    const app = await offered();
    await assert.rejects(
      db.query("select configure_internship($1,current_date+2,current_date)", [
        app,
      ]),
      /valid start/,
    );
    await assert.rejects(
      db.query("update applications set status='Completed' where id=$1", [app]),
      /acceptance/,
    );
    await as(stranger);
    await assert.rejects(
      db.query("select configure_internship($1,current_date,current_date+30)", [
        app,
      ]),
      /Only the opportunity owner/,
    );
    await assert.rejects(
      db.query("select assign_internship_supervisor($1,$2,'Mentor')", [
        app,
        mentor,
      ]),
      /Only the opportunity owner/,
    );
    await as(owner);
    await db.query(
      "select configure_internship($1,current_date,current_date+30)",
      [app],
    );
    await assert.rejects(
      db.query("select respond_internship_offer($1,'Accepted')", [app]),
      /Only the applicant/,
    );
    await as(student);
    await db.query("select respond_internship_offer($1,'Accepted')", [app]);
    await assert.rejects(
      db.query("select respond_internship_offer($1,'Declined')", [app]),
      /already recorded/,
    );
    await as(owner);
    await assert.rejects(
      db.query("select configure_internship($1,current_date,current_date+40)", [
        app,
      ]),
      /cannot change/,
    );
    const milestone = (
      await db.query(
        "insert into internship_milestones(application_id,title) values($1,'Review delivery') returning id",
        [app],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query("update applications set status='Completed' where id=$1", [app]),
      /pending milestones/,
    );
    await db.query("select assign_internship_supervisor($1,$2,'Mentor')", [
      app,
      mentor,
    ]);
    await as(mentor);
    assert.equal(
      (await db.exec("select * from internship_milestones"))[0].rows.length,
      0,
      "pending mentor has no access",
    );
    const invitation = (await db.query("select my_supervision() invitations"))
      .rows[0].invitations[0].id;
    await db.query("select respond_supervision($1,'Accepted')", [invitation]);
    assert.equal(
      (await db.query("select * from internship_milestones")).rows.length,
      1,
    );
    for (const table of [
      "applications",
      "portfolio_records",
      "assessment_reports",
    ])
      assert.equal(
        (await db.query("select * from " + table)).rows.length,
        0,
        "supervision does not grant " + table,
      );
    await assert.rejects(
      db.query(
        "insert into internship_milestones(application_id,title) values($1,'Unapproved scope')",
        [app],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "update internship_milestones set status='Approved' where id=$1",
        [milestone],
      ),
      /submit a log/,
    );
    await as(student);
    await db.query(
      "insert into internship_logs(application_id,milestone_id,week_ending,summary) values($1,$2,current_date,'Delivered and tested the requested functionality')",
      [app, milestone],
    );
    await as(mentor);
    await db.query(
      "update internship_milestones set status='Approved',feedback='Reviewed by assigned mentor' where id=$1",
      [milestone],
    );
    assert.equal(
      (await db.query("select status from internship_milestones")).rows[0]
        .status,
      "Approved",
    );
    await as(institution);
    await db.query("select assign_internship_supervisor($1,$2,'Faculty')", [
      app,
      faculty,
    ]);
    await as(faculty);
    const facultyInvitation = (
      await db.query("select my_supervision() invitations")
    ).rows[0].invitations[0].id;
    await db.query("select respond_supervision($1,'Accepted')", [
      facultyInvitation,
    ]);
    assert.equal(
      (await db.query("select * from internship_logs")).rows.length,
      1,
    );
    await as(institution);
    await db.query(
      "update institution_memberships set status='Declined' where member_id=$1",
      [faculty],
    );
    await as(faculty);
    assert.equal(
      (await db.query("select * from internship_logs")).rows.length,
      0,
      "membership removal revokes faculty access",
    );
    await as(owner);
    await db.query("select assign_internship_supervisor($1,null,'Mentor')", [
      app,
    ]);
    await as(mentor);
    assert.equal(
      (await db.query("select * from internship_logs")).rows.length,
      0,
      "revoked mentor loses access",
    );
    await as(institution);
    await db.query("select assign_internship_supervisor($1,null,'Faculty')", [
      app,
    ]);
    await as(owner);
    await completeTestInternship(db, app);
    await db.query("select assign_internship_supervisor($1,null,'Mentor')", [
      app,
    ]);
    await assert.rejects(
      db.query("select assign_internship_supervisor($1,$2,'Mentor')", [
        app,
        mentor,
      ]),
      /completed assignments may only be revoked/,
    );

    const declined = await offered();
    await db.query(
      "select configure_internship($1,current_date,current_date+30)",
      [declined],
    );
    await as(student);
    await db.query("select respond_internship_offer($1,'Declined')", [
      declined,
    ]);
    await assert.rejects(
      db.query(
        "insert into internship_logs(application_id,week_ending,summary) values($1,current_date,'Not accepted internship')",
        [declined],
      ),
      /row-level security/,
    );
    await as(owner);
    await assert.rejects(
      db.query("update applications set status='Completed' where id=$1", [
        declined,
      ]),
      /acceptance/,
    );
    const future = await offered();
    await db.query(
      "select configure_internship($1,current_date+7,current_date+30)",
      [future],
    );
    await as(student);
    await db.query("select respond_internship_offer($1,'Accepted')", [future]);
    await assert.rejects(
      db.query(
        "insert into internship_logs(application_id,week_ending,summary) values($1,current_date,'Work before the start date')",
        [future],
      ),
      /row-level security/,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.exec("select my_supervision()"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
