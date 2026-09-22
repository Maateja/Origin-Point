import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
test("cross-sector collaboration preserves confidentiality, delivery review and two-party completion", async () => {
  const db = await createTestDatabase();
  const owner = "11111111-1111-4111-8111-111111111111",
    faculty = "22222222-2222-4222-8222-222222222222",
    institution = "33333333-3333-4333-8333-333333333333",
    student = "44444444-4444-4444-8444-444444444444",
    other = "55555555-5555-4555-8555-555555555555";
  async function as(id) {
    await db.exec("reset role");
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",
      [id],
    );
    await db.exec("set role authenticated");
  }
  const scope = [
    "Investigate a reproducible method for industrial energy forecasting",
    "Deliver a tested model and documented evaluation",
    "Six weeks with weekly reviews",
    "Faculty time and a non-sensitive public dataset",
    "Use public data only; publication and IP rights require a separate agreement",
  ];
  try {
    for (const [id, role] of [
      [owner, "industry"],
      [faculty, "academician"],
      [institution, "institution"],
      [student, "student"],
      [other, "industry"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: role }],
      );
    await as(owner);
    const opportunity = (
      await db.query(
        "insert into opportunities(title,company,type,audience,location,work_mode,duration,deadline,description,seats) values('Energy forecasting research','Industry lab','Research','academician','Remote','Remote','Six weeks',current_date+30,'Research collaboration for reproducible energy demand forecasting',2) returning id",
      )
    ).rows[0].id;
    await as(student);
    await assert.rejects(
      db.query("select submit_collaboration_proposal($1,$2,$3,$4,$5,$6)", [
        opportunity,
        ...scope,
      ]),
      /partner account/,
    );
    await as(other);
    await assert.rejects(
      db.query("select submit_collaboration_proposal($1,$2,$3,$4,$5,$6)", [
        opportunity,
        ...scope,
      ]),
      /industry account and/,
    );
    await as(faculty);
    await db.query(
      "insert into institution_memberships(institution_id) values($1)",
      [institution],
    );
    const proposal = (
      await db.query(
        "select submit_collaboration_proposal($1,$2,$3,$4,$5,$6) id",
        [opportunity, ...scope],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query("select submit_collaboration_proposal($1,$2,$3,$4,$5,$6)", [
        opportunity,
        ...scope,
      ]),
      /unique constraint/,
    );
    await assert.rejects(
      db.query(
        "select decide_collaboration_proposal($1,'Accepted','Accepting my own proposal is not allowed')",
        [proposal],
      ),
      /Only the opportunity owner/,
    );
    await as(institution);
    await db.exec("update institution_memberships set status='Approved'");
    assert.equal(
      (await db.query("select * from collaboration_proposals")).rows.length,
      0,
      "membership does not expose private research proposals",
    );
    await as(owner);
    assert.ok(
      (
        await db.query(
          "select * from notifications where category='Collaboration'",
        )
      ).rows.length,
    );
    await db.query(
      "select decide_collaboration_proposal($1,'Accepted','Scope accepted for this research collaboration')",
      [proposal],
    );
    await assert.rejects(
      db.query(
        "select finish_collaboration($1,'Confirm','Trying to complete before proposer request')",
        [proposal],
      ),
      /request completion first/,
    );
    await db.query(
      "select add_collaboration_milestone($1,'Baseline model','Deliver reproducible baseline evaluation and tests',current_date+7)",
      [proposal],
    );
    const milestone = (
      await db.query("select id from collaboration_milestones")
    ).rows[0].id;
    await assert.rejects(
      db.query(
        "select review_collaboration_milestone($1,'Approved','Cannot approve without linked evidence')",
        [milestone],
      ),
      /linked delivery evidence/,
    );
    await as(faculty);
    await assert.rejects(
      db.query(
        "select finish_collaboration($1,'Request','Request before milestones are approved')",
        [proposal],
      ),
      /approval of all milestones/,
    );
    await assert.rejects(
      db.query(
        "select post_collaboration_update($1,'Trying to link an unrelated milestone','99999999-9999-4999-8999-999999999999','https://example.test/work')",
        [proposal],
      ),
      /this collaboration/,
    );
    await db.query(
      "select post_collaboration_update($1,'Reproducible baseline model and test outputs are ready',$2,'https://example.test/baseline')",
      [proposal, milestone],
    );
    await as(other);
    for (const table of [
      "collaboration_proposals",
      "collaboration_milestones",
      "collaboration_updates",
      "collaboration_events",
    ])
      assert.equal((await db.query("select * from " + table)).rows.length, 0);
    await assert.rejects(
      db.query(
        "select review_collaboration_milestone($1,'Approved','Unrelated account cannot approve delivery')",
        [milestone],
      ),
      /Only the owner/,
    );
    await as(owner);
    await db.query(
      "select review_collaboration_milestone($1,'Approved','Tested the baseline and reproduced the documented results')",
      [milestone],
    );
    await as(faculty);
    await db.query(
      "select finish_collaboration($1,'Request','All agreed baseline deliverables have been reviewed')",
      [proposal],
    );
    await db.query(
      "select post_collaboration_update($1,'Revised baseline delivery requires renewed owner review',$2,'https://example.test/revised')",
      [proposal, milestone],
    );
    assert.equal(
      (
        await db.query(
          "select completion_requested_at from collaboration_proposals",
        )
      ).rows[0].completion_requested_at,
      null,
      "new delivery clears stale completion request",
    );
    assert.equal(
      (await db.query("select status from collaboration_milestones")).rows[0]
        .status,
      "Pending",
    );
    await as(owner);
    await db.query(
      "select review_collaboration_milestone($1,'Approved','Reviewed the revised baseline and documented results')",
      [milestone],
    );
    await as(faculty);
    await db.query(
      "select finish_collaboration($1,'Request','All revised deliverables have been approved')",
      [proposal],
    );
    await as(owner);
    await db.query(
      "select finish_collaboration($1,'Return','Please clarify the final handoff and record its location')",
      [proposal],
    );
    await as(faculty);
    await db.query(
      "select post_collaboration_update($1,'Final handoff is documented in the project repository',null,'https://example.test/handoff')",
      [proposal],
    );
    await db.query(
      "select finish_collaboration($1,'Request','The final handoff and delivery location are documented')",
      [proposal],
    );
    await as(owner);
    await db.query(
      "select finish_collaboration($1,'Confirm','Reviewed and confirmed the agreed project handoff')",
      [proposal],
    );
    assert.equal(
      (await db.query("select status from collaboration_proposals")).rows[0]
        .status,
      "Completed",
    );
    assert.ok(
      (await db.query("select * from collaboration_events")).rows.length >= 10,
    );
    await assert.rejects(
      db.exec("update collaboration_proposals set status='Accepted'"),
      /permission denied/,
    );
    await as(faculty);
    await assert.rejects(
      db.query(
        "select post_collaboration_update($1,'Cannot rewrite a completed partnership',null,'')",
        [proposal],
      ),
      /open collaboration/,
    );
    assert.equal(
      (await db.query("select * from applications")).rows.length,
      0,
      "partnership does not fabricate a recruitment application",
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.exec("select * from collaboration_proposals"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
