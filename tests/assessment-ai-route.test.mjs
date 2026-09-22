import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as prompts from "../lib/ai/assessment-prompts.mjs";
const compiled = ts.transpileModule(
  readFileSync(
    new URL("../app/api/ai/generate-questions/route.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const brief = {
  consent: true,
  title: "Designer",
  skills: ["Design"],
  count: 1,
  difficulty: "Junior / Intern",
  categoryFocus: "Balanced",
};
const question = {
  question: "Which approach best checks whether a layout meets the brief?",
  options: [
    "Review against the requirements",
    "Ignore requirements",
    "Choose randomly",
    "Remove all text",
  ],
  correctAnswer: 0,
  explanation:
    "Reviewing the layout against stated requirements tests the intended result.",
  skillArea: "Design",
  category: "Technical",
};
function harness({
  role = "industry",
  user = { id: "author" },
  configured = true,
  ok = true,
  raw = JSON.stringify([question]),
  finish = "STOP",
} = {}) {
  const sent = [],
    exports = {};
  const db = {
    auth: { getUser: async () => ({ data: { user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { role }, error: null }) }),
      }),
    }),
  };
  new Function("exports", "require", "process", "fetch", compiled)(
    exports,
    (name) =>
      name === "next/server"
        ? {
            NextResponse: {
              json: (body, options) => ({ body, status: options.status }),
            },
          }
        : name.includes("assessment-prompts")
          ? prompts
          : { createClient: async () => db },
    { env: configured ? { GEMINI_API_KEY: "test-only" } : {} },
    async (url, options) => {
      sent.push(JSON.parse(options.body));
      return {
        ok,
        json: async () => ({
          candidates: [
            { finishReason: finish, content: { parts: [{ text: raw }] } },
          ],
        }),
      };
    },
  );
  return {
    post: (body = brief) =>
      exports.POST(
        new Request("http://localhost/api/ai/generate-questions", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      ),
    sent,
  };
}
test("question route requires author identity, consent and configuration without contacting Gemini", async () => {
  for (const [config, status] of [
    [{ user: null }, 401],
    [{ role: "student" }, 403],
    [{ configured: false }, 503],
  ]) {
    const h = harness(config);
    assert.equal((await h.post()).status, status);
    assert.equal(h.sent.length, 0);
  }
  const h = harness();
  assert.equal((await h.post({ ...brief, consent: false })).status, 400);
  assert.equal(h.sent.length, 0);
});
test("question route returns reviewed-only metadata and isolates context from system prompt", async () => {
  const h = harness();
  const r = await h.post();
  assert.equal(r.status, 200);
  assert.equal(r.body.requiresReview, true);
  assert.equal(r.body.promptVersion, prompts.ASSESSMENT_PROMPT_VERSION);
  assert.deepEqual(r.body.questions, [question]);
  assert.equal(
    h.sent[0].systemInstruction.parts[0].text,
    prompts.assessmentSystemPrompt,
  );
  assert.equal(
    JSON.parse(h.sent[0].contents[0].parts[0].text).title,
    "Designer",
  );
  assert.equal((await h.post()).status, 429);
  assert.equal(h.sent.length, 1);
});
test("question route never substitutes templates for unavailable, truncated or invalid model output", async () => {
  for (const config of [
    { ok: false },
    { finish: "MAX_TOKENS" },
    { raw: "not JSON" },
    { raw: JSON.stringify([{ ...question, correctAnswer: 8 }]) },
  ]) {
    const r = await harness(config).post();
    assert.ok(r.status >= 500);
    assert.equal(r.body.questions, undefined);
    assert.equal(r.body.source, undefined);
  }
});
