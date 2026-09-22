import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
test("professional learning programs enforce enrollment capacity, privacy and reviewed completion", async () => {
  const db = await createTestDatabase();
  const ids = {
    owner: "11111111-1111-4111-8111-111111111111",
    student: "22222222-2222-4222-8222-222222222222",
    other: "33333333-3333-4333-8333-333333333333",
    faculty: "44444444-4444-4444-8444-444444444444",
    institution: "55555555-5555-4555-8555-555555555555",
    outsider: "66666666-6666-4666-8666-666666666666",
  };
  async function as(id) {
    await db.exec("reset role");
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",
      [id],
    );
    await db.exec("set role authenticated");
  }
  try {
    for (const [name, role] of [
      ["owner", "industry"],
      ["student", "student"],
      ["other", "student"],
      ["faculty", "academician"],
      ["institution", "institution"],
      ["outsider", "industry"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [ids[name], name + "@example.test", { role, full_name: name }],
      );
    const today = (
      await db.query(
        "select (now() at time zone 'Asia/Kolkata')::date::text today",
      )
    ).rows[0].today;
    const payload = {
      title: "Practical SQL Workshop",
      format: "Workshop",
      level: "Intermediate",
      audience: "student",
      work_mode: "Remote",
      location: "Online classroom",
      duration: "Six live hours",
      starts_on: today,
      ends_on: today,
      deadline: today,
      seats: 1,
      description:
        "An instructor-led workshop on querying and testing relational data.",
      skills: ["SQL"],
      outcomes: [
        "Write reliable SQL queries",
        "Evaluate query execution plans",
      ],
      curriculum: [
        "Session one: joins and aggregations",
        "Session two: query plans and tests",
      ],
      schedule: "10:00–16:00 Asia/Kolkata, attendance required",
      prerequisites: "Basic relational database concepts required",
      instructor: "Database engineering team",
      fee_terms: "Free; no payment required",
      credential_terms:
        "Participation acknowledgment only; no accreditation claim",
      completion_rules: "Submit a tested query portfolio for publisher review",
      contact: "training@example.test",
    };
    await as(ids.student);
    await assert.rejects(
      db.query("select publish_learning_program($1)", [payload]),
      /Only industry/,
    );
    await db.exec(
      "insert into portfolio_records(kind,title) values('skill','Private skill')",
    );
    await as(ids.owner);
    await assert.rejects(
      db.query("select publish_learning_program($1)", [payload]),
      /organization/,
    );
    await db.exec(
      "update profiles set organization='Actual publisher organization'",
    );
    await assert.rejects(
      db.query("select publish_learning_program($1)", [
        { ...payload, outcomes: ["Vague"] },
      ]),
      /specific outcomes/,
    );
    const program = (
      await db.query("select publish_learning_program($1) id", [payload])
    ).rows[0].id;
    assert.equal(
      (
        await db.query("select company from opportunities where id=$1", [
          program,
        ])
      ).rows[0].company,
      "Actual publisher organization",
    );
    await assert.rejects(
      db.exec("update learning_programs set fee_terms='Changed terms'"),
      /permission denied/,
    );
    await as(ids.faculty);
    await assert.rejects(
      db.query("select enroll_learning_program($1,true)", [program]),
      /not available/,
    );
    await as(ids.student);
    await assert.rejects(
      db.query("select apply_to_opportunity($1)", [program]),
      /program enrollment/,
    );
    await assert.rejects(
      db.query("select enroll_learning_program($1,false)", [program]),
      /Acknowledge/,
    );
    const enrollment = (
      await db.query("select enroll_learning_program($1,true) id", [program])
    ).rows[0].id;
    assert.equal(
      (await db.query("select enroll_learning_program($1,true) id", [program]))
        .rows[0].id,
      enrollment,
    );
    await as(ids.other);
    assert.equal(
      (await db.query("select * from program_enrollments")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select enroll_learning_program($1,true)", [program]),
      /full/,
    );
    await as(ids.student);
    await db.query(
      "insert into institution_memberships(institution_id) values($1)",
      [ids.institution],
    );
    const submission = (
      await db.query("select submit_program_work($1,$2,$3) id", [
        enrollment,
        "Created and tested the SQL query portfolio",
        "https://example.test/project",
      ])
    ).rows[0].id;
    await assert.rejects(
      db.query(
        "select review_program_work($1,'Completed','Student self approval attempt')",
        [submission],
      ),
      /Only the publisher/,
    );
    await as(ids.owner);
    assert.equal(
      (await db.query("select * from portfolio_records")).rows.length,
      0,
      "enrollment does not share unrelated portfolio",
    );
    await db.query(
      "select review_program_work($1,'Changes requested','Add tests for missing data scenarios')",
      [submission],
    );
    await as(ids.student);
    const latest = (
      await db.query("select submit_program_work($1,$2,$3) id", [
        enrollment,
        "Added missing-data tests and updated documentation",
        "https://example.test/revised",
      ])
    ).rows[0].id;
    await as(ids.owner);
    await assert.rejects(
      db.query(
        "select review_program_work($1,'Completed','Old submission is not authoritative')",
        [submission],
      ),
      /latest submission/,
    );
    await as(ids.institution);
    assert.equal(
      (await db.query("select * from program_submissions")).rows.length,
      0,
    );
    await db.exec("update institution_memberships set status='Approved'");
    assert.equal(
      (await db.query("select * from program_submissions")).rows.length,
      2,
    );
    await assert.rejects(
      db.query(
        "select review_program_work($1,'Completed','Institution cannot impersonate publisher')",
        [latest],
      ),
      /Only the publisher/,
    );
    await as(ids.outsider);
    assert.equal(
      (await db.query("select * from program_reviews")).rows.length,
      0,
    );
    await as(ids.owner);
    await db.query(
      "select review_program_work($1,'Completed','Reviewed the query portfolio against published requirements')",
      [latest],
    );
    assert.equal(
      (await db.query("select status from program_enrollments")).rows[0].status,
      "Completed",
    );
    await as(ids.student);
    assert.equal(
      (await db.query("select * from program_reviews")).rows.length,
      2,
    );
    await assert.rejects(
      db.query("select withdraw_program_enrollment($1)", [enrollment]),
      /active enrollment/,
    );
    await assert.rejects(
      db.query("select submit_program_work($1,$2,$3)", [
        enrollment,
        "Cannot edit a completed learning record",
        "https://example.test/late",
      ]),
      /active enrollment/,
    );
    assert.equal(
      (await db.query("select * from portfolio_records")).rows.length,
      1,
      "completion does not invent a verified skill",
    );
    await as(ids.owner);
    const all = (
      await db.query("select publish_learning_program($1) id", [
        { ...payload, audience: "all", format: "FDP" },
      ])
    ).rows[0].id;
    await as(ids.faculty);
    const f = (
      await db.query("select enroll_learning_program($1,true) id", [all])
    ).rows[0].id;
    await db.query("select withdraw_program_enrollment($1)", [f]);
    await assert.rejects(
      db.query("select enroll_learning_program($1,true)", [all]),
      /withdrawn/,
    );
    await as(ids.other);
    await db.query("select enroll_learning_program($1,true)", [all]);
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.exec("select * from learning_programs"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
