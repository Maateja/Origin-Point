import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";

test("student foundation persists preferences and evidence without widening access", async () => {
  const db = await createTestDatabase();
  const student = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  const employer = "33333333-3333-4333-8333-333333333333";
  const institution = "44444444-4444-4444-8444-444444444444";
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
    ]) {
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { full_name: role, role }],
      );
    }
    await as(student);
    await db.exec(
      "update profiles set discoverable=true,preferred_roles=array['Frontend developer'],preferred_locations=array['Hyderabad'],preferred_work_modes=array['Remote'],available_from='2027-01-01'",
    );
    await assert.rejects(
      db.exec("update profiles set preferred_work_modes=array['Invalid']"),
      /check constraint/,
    );
    const record = (
      await db.query(
        "insert into portfolio_records(kind,title,contribution,associated_skills) values('project','Student project','Built the interface',array['React']) returning id",
      )
    ).rows[0].id;
    await db.query(
      "update portfolio_records set title='Updated project',contribution='Built and tested the interface' where id=$1",
      [record],
    );
    assert.equal(
      (
        await db.query(
          "select contribution from portfolio_records where id=$1",
          [record],
        )
      ).rows[0].contribution,
      "Built and tested the interface",
    );
    await assert.rejects(
      db.query("update portfolio_records set verified_at=now() where id=$1", [
        record,
      ]),
      /permission denied/,
    );
    await assert.rejects(
      db.query("update portfolio_records set user_id=$1 where id=$2", [
        other,
        record,
      ]),
      /permission denied/,
    );
    await assert.rejects(
      db.exec(
        "insert into portfolio_records(kind,title,proficiency) values('skill','SQL','Expert')",
      ),
      /check constraint/,
    );
    await db.query(
      "insert into institution_memberships(institution_id,member_id) values($1,$2)",
      [institution, student],
    );
    await as(other);
    assert.equal(
      (await db.query("select * from portfolio_records where id=$1", [record]))
        .rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update portfolio_records set title='Spoof' where id=$1 returning id",
          [record],
        )
      ).rows.length,
      0,
    );
    let person = (
      await db.query("select platform_directory() as people")
    ).rows[0].people.find((p) => p.id === student);
    assert.equal(
      person.preferred_roles,
      undefined,
      "discovery does not share career preferences",
    );
    await as(institution);
    await db.query(
      "update institution_memberships set status='Approved' where member_id=$1",
      [student],
    );
    person = (
      await db.query("select platform_directory() as people")
    ).rows[0].people.find((p) => p.id === student);
    assert.deepEqual(person.preferred_roles, ["Frontend developer"]);
    assert.equal(
      (await db.query("select * from portfolio_records where id=$1", [record]))
        .rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update portfolio_records set title='Institution edit' where id=$1 returning id",
          [record],
        )
      ).rows.length,
      0,
    );
    await as(employer);
    const job = (
      await db.query(
        "insert into opportunities(title,company,type,location,work_mode,duration,deadline,description,seats) values('Frontend internship','Company','Internship','Hyderabad','Remote','3 months',current_date+30,'Real internship requirements and responsibilities',1) returning id",
      )
    ).rows[0].id;
    await as(student);
    await db.query("select apply_to_opportunity($1)", [job]);
    await as(employer);
    person = (
      await db.query("select platform_directory() as people")
    ).rows[0].people.find((p) => p.id === student);
    assert.deepEqual(person.preferred_work_modes, ["Remote"]);
    assert.equal(
      (
        await db.query(
          "select associated_skills from portfolio_records where id=$1",
          [record],
        )
      ).rows[0].associated_skills[0],
      "React",
    );
    await db.exec("reset role");
    await db.query(
      "update portfolio_records set verified_at=now() where id=$1",
      [record],
    );
    await as(student);
    assert.equal(
      (
        await db.query(
          "update portfolio_records set title='Changed verified claim' where id=$1 returning id",
          [record],
        )
      ).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
