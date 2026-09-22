import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SKILL_TAXONOMY,
  skillKey,
  skillMatch,
} from "../lib/skill-taxonomy.mjs";
import { explainReadiness } from "../lib/readiness.mjs";
import { scoreAssessment } from "../lib/assessment-scoring.mjs";
import { createTestDatabase } from "./database-fixture.mjs";

test("aliases deduplicate requirements without claiming related skills", () => {
  assert.deepEqual(skillMatch(["React", "React.js", "SQL"], ["reactjs"]), {
    matched: ["React"],
    missing: ["SQL"],
    score: 50,
  });
  for (const [a, b] of [
    ["Java", "JavaScript"],
    ["SQL", "Postgres"],
    ["React Native", "React"],
    ["C", "C++"],
    ["Git", "GitHub"],
  ])
    assert.notEqual(skillKey(a), skillKey(b));
  assert.equal(skillMatch([], ["React"]).score, 0);
  const rows = explainReadiness(
    ["reactjs", "React"],
    ["React.js"],
    [
      {
        id: "a",
        skill: "React",
        score: 100,
        threshold: 70,
        created_at: "2026-01-01",
      },
      {
        id: "b",
        skill: "React.js",
        score: 40,
        threshold: 70,
        created_at: "2026-02-01",
      },
    ],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "Below assessment target");
  assert.equal(rows[0].evidence.id, "b");
});

test("assessment scoring combines naming aliases into one skill result", () => {
  const report = scoreAssessment(
    {
      id: "x",
      questions: [
        {
          id: 1,
          skillArea: "React",
          options: ["a", "b", "c", "d"],
          correctAnswer: 0,
        },
        {
          id: 2,
          skillArea: "react.js",
          options: ["a", "b", "c", "d"],
          correctAnswer: 0,
        },
      ],
    },
    { 1: 0, 2: 1 },
  );
  assert.equal(report.skillBreakdown.length, 1);
  assert.equal(report.skillBreakdown[0].score, 50);
  assert.equal(report.skillBreakdown[0].skill, "React");
});

test("database alias parity, guarded reference access and authoritative application scoring", async () => {
  const db = await createTestDatabase();
  const student = "11111111-1111-4111-8111-111111111111";
  const employer = "33333333-3333-4333-8333-333333333333";
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
      [employer, "industry"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: role }],
      );
    await as(employer);
    for (const value of [
      ...SKILL_TAXONOMY.flatMap((s) => [s.name, ...s.aliases]),
      "\t React.JS\n",
      "Custom   Skill",
      "Java",
      "React Native",
      "C",
      "",
    ]) {
      assert.equal(
        (await db.query("select skill_key($1) as key", [value])).rows[0].key,
        skillKey(value),
        value,
      );
    }
    const job = (
      await db.query(
        "insert into opportunities(title,company,type,location,work_mode,duration,deadline,skills,description,seats) values('Frontend internship','Company','Internship','Remote','Remote','3 months',current_date+30,array['React','React.js','SQL'],'Work on real frontend features and data integrations',1) returning id",
      )
    ).rows[0].id;
    await as(student);
    await db.exec(
      "insert into portfolio_records(kind,title) values('skill','reactjs')",
    );
    await db.query("select apply_to_opportunity($1)", [job]);
    assert.equal(
      (await db.query("select match_score from applications")).rows[0]
        .match_score,
      50,
    );
    await assert.rejects(
      db.exec(
        "create or replace function public.skill_key(value text) returns text language sql as $$select 'spoof'$$",
      ),
      /owner|permission/,
    );
    await as(employer);
    const assessment = (
      await db.query("select save_industry_assessment($1) id", [
        {
          opportunity_id: job,
          title: "React fundamentals",
          summary: "A focused check of React component fundamentals.",
          passing_score: 70,
          publish: true,
          questions: ["React", "React.js"].map((skillArea, index) => ({
            question: "Choose the correct option for component " + (index + 1),
            options: ["First", "Second", "Third", "Fourth"],
            correctAnswer: 0,
            explanation: "The first option satisfies the stated requirement.",
            skillArea,
            category: "Technical",
          })),
        },
      ])
    ).rows[0].id;
    await as(student);
    const attemptId = (
      await db.query("select start_industry_assessment($1) result", [
        assessment,
      ])
    ).rows[0].result.attemptId;
    await db.exec("reset role; set role service_role");
    const attempt = (
      await db.query("select * from assessment_attempts where id=$1", [
        attemptId,
      ])
    ).rows[0];
    await db.query("select finish_assessment($1,$2)", [
      attemptId,
      scoreAssessment(attempt, { 1: 0, 2: 1 }),
    ]);
    await as(student);
    const evidence = (await db.query("select * from skill_evidence")).rows;
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].question_count, 2);
    assert.equal(evidence[0].score, 50);
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.exec("select skill_taxonomy_version()"),
      /permission/,
    );
  } finally {
    await db.close();
  }
});
