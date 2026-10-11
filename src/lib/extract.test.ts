import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_SCENARIOS } from "./demo-scenarios";
import { extractProfileHeuristic } from "./extract";

test("demo stories become the expected profile fields", () => {
  const [falls, tremor, facility] = DEMO_SCENARIOS.map((scenario) => extractProfileHeuristic(scenario.answers));

  assert.equal(falls.respondentType, "patient");
  assert.equal(falls.stage, "unknown");
  assert.deepEqual(falls.symptoms, ["balance", "walking", "falls"]);
  assert.equal(falls.symptomFrequency, "daily");
  assert.equal(falls.falls.reported, true);
  assert.equal(falls.livingSituation, "alone");
  assert.equal(falls.supportNeeds, "daily");
  assert.equal(falls.budget, "limited");
  assert.equal(falls.location.cityOrZip, "Austin, TX 78701");
  assert.match(falls.homeEnvironment ?? "", /stairs/);
  assert.equal(falls.preferences.schedule, "Morning");
  assert.equal(falls.extractionMethod, "builtin");

  assert.equal(tremor.stage, "Early / mild");
  assert.ok(tremor.symptoms.includes("tremor"));
  assert.equal(tremor.falls.reported, false);
  assert.equal(tremor.livingSituation, "with_family");
  assert.equal(tremor.supportNeeds, "occasional");
  assert.equal(tremor.budget, "flexible");
  assert.match(tremor.location.cityOrZip ?? "", /Seattle/);
  assert.equal(tremor.preferences.language, "English");

  assert.equal(facility.respondentType, "caregiver");
  assert.equal(facility.stage, "Later / advanced");
  assert.equal(facility.livingSituation, "care_facility");
  assert.equal(facility.supportNeeds, "frequent");
  assert.equal(facility.budget, "moderate");
  assert.equal(facility.preferences.caregiverGender, "Woman");
  assert.match(facility.preferences.language ?? "", /Spanish/);
  assert.equal(facility.falls.reported, true);
});

test("empty answers stay unknown instead of guessing", () => {
  const profile = extractProfileHeuristic({ q1: "", q8: "I'd rather not say" });
  assert.equal(profile.respondentType, "unknown");
  assert.equal(profile.stage, "unknown");
  assert.deepEqual(profile.symptoms, []);
  assert.equal(profile.location.cityOrZip, null);
  assert.equal(profile.budget, "unknown");
});

test("urgent wording is kept in the raw answers", () => {
  const profile = extractProfileHeuristic({ q5: "I fell and could not get up." });
  assert.equal(profile.falls.reported, true);
  assert.match(profile.rawAnswers.q5, /could not get up/);
});
