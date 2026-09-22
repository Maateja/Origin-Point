import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createTestDatabase,
  completeTestInternship,
} from "./database-fixture.mjs";
test("certificates require reviewed completion, preserve snapshots and enforce private owner-only lifecycle", async () => {
  const db = await createTestDatabase();
  const student = "11111111-1111-4111-8111-111111111111",
    owner = "22222222-2222-4222-8222-222222222222",
    other = "33333333-3333-4333-8333-333333333333";
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
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: role }],
      );
    await as(owner);
    await assert.rejects(
      db.query(
        "select issue_internship_certificate('99999999-9999-4999-8999-999999999999')",
      ),
      /Only the opportunity owner/,
    );
    const opp = (
      await db.query(
        "insert into opportunities(title,company,type,location,work_mode,duration,deadline,description,seats) values('Certificate test','Test company','Internship','Remote','Remote','1 month',current_date+30,'Evidence reviewed internship for certificate tests',1) returning id",
      )
    ).rows[0].id;
    await as(student);
    const app = (await db.query("select apply_to_opportunity($1) id", [opp]))
      .rows[0].id;
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
    await as(owner);
    await completeTestInternship(db, app);
    const completion = (await db.query("select id from internship_completions"))
      .rows[0].id;
    await as(student);
    await assert.rejects(
      db.query("select issue_internship_certificate($1)", [completion]),
      /Only the opportunity owner/,
    );
    await as(owner);
    const id = (
      await db.query("select issue_internship_certificate($1) id", [completion])
    ).rows[0].id;
    assert.equal(
      (
        await db.query("select issue_internship_certificate($1) id", [
          completion,
        ])
      ).rows[0].id,
      id,
    );
    const cert = (await db.query("select * from internship_certificates"))
      .rows[0];
    assert.equal(cert.recipient_name, "student");
    assert.equal(cert.industry_reviewer, "industry");
    assert.equal(cert.revoked_at, null);
    await assert.rejects(
      db.exec("update internship_certificates set recipient_name='Forged'"),
      /permission denied/,
    );
    await as(student);
    await db.exec("update profiles set full_name='Updated name'");
    assert.equal(
      (await db.query("select recipient_name from internship_certificates"))
        .rows[0].recipient_name,
      "student",
      "issued names are snapshots",
    );
    await assert.rejects(
      db.query(
        "select revoke_internship_certificate($1,'Unauthorized revocation attempt')",
        [id],
      ),
      /Only the opportunity owner/,
    );
    await as(other);
    assert.equal(
      (await db.query("select * from internship_certificates")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select issue_internship_certificate($1)", [completion]),
      /Only the opportunity owner/,
    );
    await as(owner);
    await assert.rejects(
      db.query("select revoke_internship_certificate($1,'short')", [id]),
      /10–1000/,
    );
    await db.query(
      "select revoke_internship_certificate($1,'Issued with an incorrect recipient name')",
      [id],
    );
    await db.query(
      "select revoke_internship_certificate($1,'Repeated request must not overwrite history')",
      [id],
    );
    assert.equal(
      (
        await db.query("select issue_internship_certificate($1) id", [
          completion,
        ])
      ).rows[0].id,
      id,
      "reissue cannot reactivate revoked record",
    );
    await as(student);
    const revoked = (await db.query("select * from internship_certificates"))
      .rows[0];
    assert.ok(revoked.revoked_at);
    assert.equal(
      revoked.revocation_reason,
      "Issued with an incorrect recipient name",
    );
    await assert.rejects(
      db.exec("delete from internship_certificates"),
      /permission denied/,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.exec("select * from internship_certificates"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
