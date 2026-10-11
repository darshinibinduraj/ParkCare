import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DEMO_SCENARIOS } from "../demo-scenarios";

test("embedded Postgres stores answers, a plan, and deletion", async () => {
  process.env.PARKCARE_DATA_DIR = mkdtempSync(join(tmpdir(), "parkcare-"));
  delete process.env.DATABASE_URL;
  const store = await import("./store");
  const scenario = DEMO_SCENARIOS[0];
  if (!scenario) throw new Error("missing scenario");
  const sessionId = await store.createSession();
  for (const [questionKey, answerText] of Object.entries(scenario.answers)) {
    await store.upsertAnswer(sessionId, questionKey, answerText, false);
  }
  const profile = await store.syncProfile(sessionId);
  await store.saveProfile(sessionId, profile, true);
  await store.runCarePlan(sessionId);
  const view = await store.getPlanView(sessionId);
  assert.ok(view);
  assert.ok(view.plan.steps.length >= 3);
  assert.ok(view.messages.some((message) => message.round === 2));
  assert.equal(view.profile.budget, "limited");
  await store.saveProfile(sessionId, { ...view.profile, budget: "flexible" }, true);
  await store.runCarePlan(sessionId);
  const rerun = await store.getPlanView(sessionId);
  assert.match(rerun?.plan.comparisonNote ?? "", /Budget changed/);
  await store.deleteSession(sessionId);
  assert.equal(await store.getPlanView(sessionId), null);
});
