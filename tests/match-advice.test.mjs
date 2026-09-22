import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { explainReadiness } from "../lib/readiness.mjs";
const source = readFileSync(
  new URL("../app/api/ai/explain-match/route.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
function harness({
  user = { id: "me" },
  role = "student",
  configured = true,
  providerOk = true,
} = {}) {
  const queries = [],
    sent = [];
  const db = {
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      const filters = [];
      queries.push({ table, filters });
      const result = {
        data:
          table === "profiles"
            ? { role }
            : table === "opportunities"
              ? {
                  skills: ["Python"],
                  audience: "student",
                  status: "Open",
                  deadline: "2099-01-01",
                }
              : [
                  {
                    id: "e",
                    skill: "Python",
                    score: 40,
                    threshold: 70,
                    created_at: "2026-09-22",
                  },
                ],
        error: null,
      };
      const chain = {
        select() {
          return chain;
        },
        eq(...args) {
          filters.push(args);
          return chain;
        },
        single: async () => result,
        order() {
          return chain;
        },
        range: async () => result,
      };
      return chain;
    },
  };
  const exports = {};
  new Function("exports", "require", "process", "fetch", compiled)(
    exports,
    (name) =>
      name === "next/server"
        ? {
            NextResponse: {
              json: (body, options) => ({ body, status: options.status }),
            },
          }
        : name.includes("readiness")
          ? { explainReadiness }
          : { createClient: async () => db },
    { env: configured ? { GEMINI_API_KEY: "test-key" } : {} },
    async (url, options) => {
      sent.push({ url, options });
      return {
        ok: providerOk,
        json: async () => ({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [{ text: "Practice with small Python exercises." }],
              },
            },
          ],
        }),
      };
    },
  );
  const request = (consent = true) =>
    new Request("http://localhost/api/ai/explain-match", {
      method: "POST",
      body: JSON.stringify({
        consent,
        opportunityId: "11111111-1111-1111-1111-111111111111",
      }),
    });
  return { post: exports.POST, request, queries, sent };
}
test("match advice requires authentication, configuration, consent and student role", async () => {
  for (const [options, status] of [
    [{ user: null }, 401],
    [{ configured: false }, 503],
    [{ role: "industry" }, 403],
  ]) {
    const h = harness(options);
    assert.equal((await h.post(h.request())).status, status);
    assert.equal(h.sent.length, 0);
  }
  const h = harness();
  assert.equal((await h.post(h.request(false))).status, 400);
  assert.equal(h.sent.length, 0);
});
test("match advice fetches own evidence server-side, minimizes payload, and throttles repeat requests", async () => {
  const h = harness();
  const r = await h.post(h.request());
  assert.equal(r.status, 200);
  assert.equal(r.body.source, "Gemini");
  assert.ok(
    h.queries
      .find((q) => q.table === "skill_evidence")
      .filters.some(([k, v]) => k === "user_id" && v === "me"),
  );
  const body = JSON.parse(h.sent[0].options.body);
  const facts = JSON.parse(body.contents[0].parts[0].text);
  assert.deepEqual(Object.keys(facts[0]), [
    "skill",
    "status",
    "score",
    "issuerThreshold",
  ]);
  assert.equal(facts[0].score, 40);
  assert.equal((await h.post(h.request())).status, 429);
  assert.equal(h.sent.length, 1);
});
test("Gemini failures return an error rather than invented fallback advice", async () => {
  const h = harness({ providerOk: false });
  const r = await h.post(h.request());
  assert.equal(r.status, 503);
  assert.equal(r.body.text, undefined);
});
