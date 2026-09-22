import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
test("notifications are transactional, recipient-private, immutable and safely marked read", async () => {
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
      [other, "student"],
      [institution, "institution"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: role }],
      );
    await as(owner);
    assert.equal(
      (await db.query("select * from notifications")).rows.length,
      0,
      "no seeded history",
    );
    const opp = (
      await db.query(
        "insert into opportunities(title,company,type,location,work_mode,duration,deadline,description,seats) values('Private role','Company','Job','Remote','Remote','Full time',current_date+30,'An application used for notification permission tests',2) returning id",
      )
    ).rows[0].id;
    await as(student);
    const app = (await db.query("select apply_to_opportunity($1) id", [opp]))
      .rows[0].id;
    assert.equal(
      (await db.query("select * from notifications")).rows.length,
      0,
      "no self-notifications",
    );
    await as(owner);
    let notices = (await db.query("select * from notifications")).rows;
    assert.equal(notices.length, 1);
    assert.equal(notices[0].title, "Application submitted");
    assert.equal(notices[0].href, "/industry/candidates");
    const ownerNotice = notices[0].id;
    await assert.rejects(
      db.query(
        "insert into notifications(recipient_id,category,title,href,event_key) values($1,'Spoof','Forged','/student/applications','forged')",
        [student],
      ),
      /permission denied/,
    );
    await db.query("update applications set status='Shortlisted' where id=$1", [
      app,
    ]);
    await db.query("update applications set status='Shortlisted' where id=$1", [
      app,
    ]);
    await as(student);
    notices = (await db.query("select * from notifications")).rows;
    assert.equal(
      notices.length,
      1,
      "no-op application update creates no new notice",
    );
    assert.equal(notices[0].href, "/student/applications");
    await db.query("select mark_notification_read($1)", [ownerNotice]);
    await assert.rejects(
      db.exec("update notifications set title='Tampered'"),
      /permission denied/,
    );
    await db.query("select mark_notification_read($1)", [notices[0].id]);
    let read = (await db.query("select read_at from notifications")).rows[0]
      .read_at;
    assert.ok(read);
    await db.query("select mark_notification_read($1)", [notices[0].id]);
    assert.deepEqual(
      (await db.query("select read_at from notifications")).rows[0].read_at,
      read,
    );
    await as(owner);
    assert.equal(
      (
        await db.query("select read_at from notifications where id=$1", [
          ownerNotice,
        ])
      ).rows[0].read_at,
      null,
      "other recipient cannot mark owner notice read",
    );
    await as(other);
    assert.equal(
      (await db.query("select * from notifications")).rows.length,
      0,
    );
    await as(student);
    await db.query(
      "insert into institution_memberships(institution_id) values($1)",
      [institution],
    );
    await as(institution);
    assert.equal(
      (await db.query("select * from notifications")).rows.length,
      1,
    );
    await db.exec("update institution_memberships set status='Approved'");
    await as(owner);
    await db.query(
      "update applications set feedback='Private recruiter feedback' where id=$1",
      [app],
    );
    await as(institution);
    notices = (await db.query("select * from notifications")).rows;
    assert.equal(notices.length, 2);
    assert.ok(
      notices.every((n) => !n.title.includes("Private recruiter feedback")),
    );
    await db.exec("update institution_memberships set status='Declined'");
    await as(owner);
    await db.query(
      "update applications set feedback='More private feedback' where id=$1",
      [app],
    );
    await as(institution);
    assert.equal(
      (await db.query("select * from notifications")).rows.length,
      2,
      "removed membership gets no further application notices",
    );
    await db.exec("select mark_all_notifications_read()");
    assert.equal(
      (await db.query("select * from notifications where read_at is null")).rows
        .length,
      0,
    );
    await as(student);
    assert.ok(
      (await db.query("select * from notifications where read_at is null")).rows
        .length > 0,
      "mark all is recipient scoped",
    );
    const before = (await db.query("select count(*)::int n from notifications"))
      .rows[0].n;
    await as(owner);
    await db.exec("begin");
    await db.query(
      "update applications set feedback='Rolled back update' where id=$1",
      [app],
    );
    await db.exec("rollback");
    await db.exec("reset role");
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from application_events where feedback='Rolled back update'",
        )
      ).rows[0].n,
      0,
    );
    await as(student);
    assert.equal(
      (await db.query("select count(*)::int n from notifications")).rows[0].n,
      before,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.exec("select * from notifications"),
      /permission denied/,
    );
    await assert.rejects(
      db.exec("select mark_all_notifications_read()"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
