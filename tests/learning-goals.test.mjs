import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
test("learning goals: ownership, real programme links, honest completion and institution visibility", async () => {
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
    const program = (
      await db.query(
        "insert into opportunities(title,company,type,location,work_mode,duration,deadline,skills,description,seats) values('React workshop','Company','Workshop','Remote','Remote','1 week',current_date+30,array['React'],'A practical workshop on React components and testing',10) returning id",
      )
    ).rows[0].id;
    await assert.rejects(
      db.exec("insert into learning_goals(skill) values('React')"),
      /row-level security/,
    );
    await as(student);
    const goal = (
      await db.query(
        "insert into learning_goals(skill,resource_id) values('React.js',$1) returning id",
        [program],
      )
    ).rows[0].id;
    await assert.rejects(
      db.exec("insert into learning_goals(skill) values('reactjs')"),
      /unique/,
    );
    await assert.rejects(
      db.query(
        "insert into learning_goals(skill,resource_id) values('Python',$1)",
        [program],
      ),
      /matching this skill/,
    );
    await assert.rejects(
      db.query(
        "insert into learning_goals(skill,target_id) values('Python',$1)",
        [program],
      ),
      /requires this skill/,
    );
    await assert.rejects(
      db.query("update learning_goals set status='Completed' where id=$1", [
        goal,
      ]),
      /reflection/,
    );
    await assert.rejects(
      db.query("update learning_goals set completed_at=now() where id=$1", [
        goal,
      ]),
      /permission denied/,
    );
    await db.query(
      "update learning_goals set notes='Built a component and tested its behaviour',status='Completed',evidence_url='https://example.test/project' where id=$1",
      [goal],
    );
    assert.ok(
      (
        await db.query("select completed_at from learning_goals where id=$1", [
          goal,
        ])
      ).rows[0].completed_at,
    );
    assert.equal(
      (await db.query("select * from skill_evidence")).rows.length,
      0,
      "self-reported completion does not create assessment evidence",
    );
    await db.query(
      "insert into institution_memberships(institution_id,member_id) values($1,$2)",
      [institution, student],
    );
    await as(other);
    assert.equal(
      (await db.query("select * from learning_goals")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update learning_goals set notes='Tamper' where id=$1 returning id",
          [goal],
        )
      ).rows.length,
      0,
    );
    await as(employer);
    assert.equal(
      (await db.query("select * from learning_goals")).rows.length,
      0,
    );
    await as(institution);
    assert.equal(
      (await db.query("select * from learning_goals")).rows.length,
      0,
      "pending membership does not share goals",
    );
    await db.query(
      "update institution_memberships set status='Approved' where member_id=$1",
      [student],
    );
    assert.equal(
      (await db.query("select * from learning_goals")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update learning_goals set notes='Institution change' where id=$1 returning id",
          [goal],
        )
      ).rows.length,
      0,
    );
    await as(student);
    await db.query(
      "update learning_goals set status='In progress',archived=true where id=$1",
      [goal],
    );
    assert.equal(
      (
        await db.query("select completed_at from learning_goals where id=$1", [
          goal,
        ])
      ).rows[0].completed_at,
      null,
    );
    await db.exec("insert into learning_goals(skill) values('React')");
    await assert.rejects(
      db.query("update learning_goals set archived=false where id=$1", [goal]),
      /unique/,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.exec("select * from learning_goals"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
