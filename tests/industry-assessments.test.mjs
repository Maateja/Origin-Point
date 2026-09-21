import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
import { scoreAssessment } from "../lib/assessment-scoring.mjs";
import { explainReadiness } from "../lib/readiness.mjs";

test("industry authoring, immutable versions, hidden keys, scoped evidence and atomic submissions", async () => {
  const db = await createTestDatabase();
  const employer = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    student = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    outsider = "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    faculty = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  try {
    for (const [id, role] of [
      [employer, "industry"],
      [student, "student"],
      [outsider, "industry"],
      [faculty, "academician"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { full_name: "Local test", role }],
      );
    async function as(id, role = "authenticated") {
      await db.exec("reset role");
      await db.query(
        "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role',$2,false)",
        [id, role],
      );
      await db.exec("set role " + role);
    }
    await as(employer);
    const opportunity = (
      await db.query(
        "insert into opportunities(title,company,type,audience,location,work_mode,duration,deadline,skills,description,seats) values('Test opening','Test employer','Internship','student','Remote','Remote','3 months',current_date+30,array['SQL'],'A real requirement structure for local testing only.',2) returning id",
      )
    ).rows[0].id;
    const questions = [
      {
        question: "Which keyword reads rows from a table?",
        options: ["SELECT", "DROP", "DELETE", "ALTER"],
        correctAnswer: 0,
        explanation: "SELECT reads rows without deleting them.",
        skillArea: "SQL",
        category: "Technical",
      },
      {
        question: "Which statement removes a database table?",
        options: ["SELECT", "DROP", "INSERT", "UPDATE"],
        correctAnswer: 1,
        explanation: "DROP TABLE removes the table.",
        skillArea: "SQL",
        category: "Technical",
      },
    ];
    const definition = {
      opportunity_id: opportunity,
      title: "SQL role assessment",
      summary: "An employer-defined test of SQL fundamentals.",
      passing_score: 80,
      publish: false,
      questions,
    };
    const save = async (value) =>
      (await db.query("select save_industry_assessment($1) id", [value]))
        .rows[0].id;
    const draft = await save(definition);
    assert.equal(
      (await db.query("select * from industry_assessments")).rows.length,
      1,
    );
    await assert.rejects(
      db.query("select * from private.industry_assessment_content"),
      /permission denied/,
    );
    assert.equal(
      (
        await db.query("select industry_assessment_definition($1) definition", [
          draft,
        ])
      ).rows[0].definition.questions[0].correctAnswer,
      0,
    );
    await as(student);
    assert.equal(
      (await db.query("select * from industry_assessments")).rows.length,
      0,
      "students cannot see drafts",
    );
    await assert.rejects(save(definition), /Only industry/);
    await assert.rejects(
      db.query("select industry_assessment_definition($1)", [draft]),
      /not found/,
    );
    await assert.rejects(
      db.query("select start_industry_assessment($1)", [draft]),
      /not found/,
    );
    await as(outsider);
    await assert.rejects(
      save({ ...definition, id: draft }),
      /owned by your account/,
    );
    await assert.rejects(
      db.query("select industry_assessment_definition($1)", [draft]),
      /not found/,
    );
    await as(employer);
    await assert.rejects(
      save({
        ...definition,
        questions: [{ ...questions[0], correctAnswer: 7 }],
      }),
      /Invalid question/,
    );
    await assert.rejects(
      save({
        ...definition,
        questions: [
          { ...questions[0], options: ["same", "SAME", "third", "fourth"] },
        ],
      }),
      /distinct/,
    );
    assert.equal(
      await save({ ...definition, id: draft, publish: true }),
      draft,
    );
    await assert.rejects(
      save({ ...definition, id: draft, publish: false }),
      /immutable/,
    );
    await as(faculty);
    await assert.rejects(
      db.query("select start_industry_assessment($1)", [draft]),
      /Only student/,
    );
    await as(student);
    const start = (
      await db.query("select start_industry_assessment($1) result", [draft])
    ).rows[0].result;
    assert.ok(
      start.questions.every(
        (q) => !("correctAnswer" in q) && !("explanation" in q),
      ),
      "answer keys never reach the student",
    );
    assert.equal(
      (await db.query("select start_industry_assessment($1) result", [draft]))
        .rows[0].result.attemptId,
      start.attemptId,
      "start resumes, not duplicates",
    );
    await assert.rejects(
      db.query("insert into skill_evidence(user_id,skill) values($1,$2)", [
        student,
        "Fake",
      ]),
      /permission denied/,
    );
    await as(student, "service_role");
    const attempt = (
      await db.query("select * from assessment_attempts where id=$1", [
        start.attemptId,
      ])
    ).rows[0];
    const result = scoreAssessment(attempt, { 1: 0, 2: 0 });
    assert.equal(result.targetPercent, 80);
    assert.equal(result.skillBreakdown[0].benchmark, 80);
    await db.query("select finish_assessment($1,$2)", [attempt.id, result]);
    await db.query("select finish_assessment($1,$2)", [
      attempt.id,
      { ...result, scorePercent: 100 },
    ]);
    await as(student);
    const evidence = (await db.query("select * from skill_evidence")).rows;
    assert.equal(
      evidence.length,
      1,
      "idempotent submissions produce one evidence record per competency",
    );
    assert.equal(evidence[0].score, 50);
    assert.equal(evidence[0].threshold, 80);
    assert.equal(evidence[0].question_count, 2);
    assert.equal(
      (await db.query("select start_industry_assessment($1) result", [draft]))
        .rows[0].result.report.scorePercent,
      50,
    );
    await as(employer);
    assert.equal(
      (await db.query("select * from skill_evidence")).rows.length,
      0,
      "author cannot browse private candidate evidence without consent",
    );
    const revised = await save({
      ...definition,
      supersedes: draft,
      publish: true,
    });
    assert.equal(
      (
        await db.query("select version from industry_assessments where id=$1", [
          revised,
        ])
      ).rows[0].version,
      2,
    );
    await assert.rejects(
      save({ ...definition, supersedes: draft, publish: true }),
      /unique/,
    );
    await as(student);
    await db.query("select apply_to_opportunity($1)", [opportunity]);
    await as(employer);
    assert.equal(
      (await db.query("select * from skill_evidence")).rows.length,
      1,
      "application shares evidence with the opportunity owner",
    );
    await assert.rejects(
      db.query("select * from assessment_attempts"),
      /permission denied/,
      "recruiter still cannot access private answer sheets",
    );
    await as(outsider);
    assert.equal(
      (await db.query("select * from skill_evidence")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});

test("readiness separates claims from latest assessed evidence and does not inflate coverage", () => {
  const evidence = [
    {
      id: "a",
      skill: "SQL",
      score: 100,
      threshold: 80,
      created_at: "2026-01-01",
    },
    {
      id: "b",
      skill: "sql",
      score: 50,
      threshold: 80,
      created_at: "2026-02-01",
    },
  ];
  const rows = explainReadiness(
    ["SQL", " sql ", "React", "Python"],
    ["React", "SQL"],
    evidence,
  );
  assert.equal(rows.length, 3);
  assert.equal(rows[0].status, "Below assessment target");
  assert.equal(rows[1].status, "Self-declared");
  assert.equal(rows[2].status, "No evidence");
  assert.deepEqual(explainReadiness([], ["SQL"], evidence), []);
});
