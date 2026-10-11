import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { loadHrsaSites } from "../../data/hrsa-sites";
import { caregiverServices, equipmentItems, medicalResources } from "../../data/seed/catalog";
import { DEMO_SCENARIOS } from "../demo-scenarios";
import { extractProfileHeuristic } from "../extract";
import { createPlan } from "./orchestrator";
import { detectUrgent } from "./synthesizer";
import type { Dataset } from "../resources";
import type { PatientProfile } from "../schemas";

const hrsaSites = loadHrsaSites();

const data: Dataset = {
  medical: [...medicalResources, ...hrsaSites],
  equipment: equipmentItems,
  caregivers: caregiverServices,
};

function profileFor(id: string): PatientProfile {
  const scenario = DEMO_SCENARIOS.find((item) => item.id === id);
  if (!scenario) throw new Error(id);
  return extractProfileHeuristic(scenario.answers);
}

function titles(plan: ReturnType<typeof createPlan>["plan"], key: "medical" | "equipment" | "caregiver") {
  return plan[key].map((item) => item.title);
}

test("seed JSON matches the catalog", () => {
  const dir = join(process.cwd(), "src/data/seed");
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "medical.json"), "utf8")), medicalResources);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "equipment.json"), "utf8")), equipmentItems);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, "caregivers.json"), "utf8")), caregiverServices);
});

test("seed rows are either verified or simulated, never both", () => {
  for (const row of [...medicalResources, ...equipmentItems, ...caregiverServices]) {
    assert.notEqual(row.verified, row.simulated, row.name);
    if (row.verified) {
      const link = "website" in row ? row.website : row.productUrl;
      assert.match(link ?? "", /^https:\/\//, row.name);
    }
  }
  for (const item of equipmentItems) {
    if (item.verified) assert.equal(item.estimatedPriceUsd, null, item.name);
    if (item.simulated) assert.equal(item.productUrl, null, item.name);
  }
  assert.ok(medicalResources.length >= 3);
  assert.ok(hrsaSites.length > 10000);
  for (const row of hrsaSites) {
    assert.equal(row.verified, true, row.name);
    assert.equal(row.simulated, false, row.name);
    if (row.website) assert.match(row.website, /^https:\/\//, row.name);
  }
  assert.ok(equipmentItems.length >= 7);
  assert.ok(caregiverServices.length >= 2);
  assert.equal(equipmentItems.some((item) => item.simulated), false);
  assert.equal(caregiverServices.some((item) => item.simulated), false);
});

test("three fictional patients get a plan from all three helpers", () => {
  for (const scenario of DEMO_SCENARIOS) {
    const { plan, messages } = createPlan(profileFor(scenario.id), data, null);
    assert.ok(plan.medical.length > 0, scenario.id);
    assert.ok(plan.equipment.length > 0, scenario.id);
    assert.ok(plan.caregiver.length > 0, scenario.id);
    const ids = new Set([...data.medical, ...data.equipment, ...data.caregivers].map((item) => item.id));
    for (const item of [...plan.medical, ...plan.equipment, ...plan.caregiver]) {
      assert.ok(item.resourceId && ids.has(item.resourceId), item.title);
    }
    const senders = new Set(messages.map((message) => message.sender));
    assert.ok(senders.has("medical"));
    assert.ok(senders.has("equipment"));
    assert.ok(senders.has("caregiver"));
    assert.ok(senders.has("synthesizer"));
    assert.ok(messages.some((message) => message.round === 2));
    const agents = new Set(plan.steps.flatMap((step) => step.agents));
    assert.ok(agents.has("medical") && agents.has("equipment") && agents.has("caregiver"));
    assert.equal(plan.urgent.active, false);
  }
});

test("equipment's home-safety note moves a community clinic ahead of a weaker site", () => {
  const { plan, messages } = createPlan(profileFor("falls-alone"), data, null);
  const note = messages
    .filter((message) => message.round === 2 && message.sender === "medical")
    .map((message) => message.content)
    .join(" ");
  assert.match(note, /ahead of CommUnityCare Austin Resource Center for the Homeless/);
  const moved = note.match(/I moved (.+) ahead of CommUnityCare Austin Resource Center for the Homeless/)?.[1];
  const titles = plan.medical.map((item) => item.title);
  const shelter = titles.indexOf("CommUnityCare Austin Resource Center for the Homeless");
  assert.ok(moved);
  assert.ok(titles.indexOf(moved) >= 0 && shelter >= 0 && titles.indexOf(moved) < shelter);
});

test("plans list only verified equipment guidance and public helplines", () => {
  const base = profileFor("falls-alone");
  const limited = createPlan(base, data, null).plan;
  const flexible = createPlan({ ...base, budget: "flexible" }, data, limited).plan;
  for (const plan of [limited, flexible]) {
    for (const title of titles(plan, "equipment")) {
      const row = equipmentItems.find((item) => item.name === title);
      assert.equal(row?.verified, true, title);
      assert.equal(row?.estimatedPriceUsd, null, title);
    }
    for (const title of titles(plan, "caregiver")) {
      const row = caregiverServices.find((item) => item.name === title);
      assert.equal(row?.verified, true, title);
    }
    assert.equal(titles(plan, "equipment").includes("Rolling walker"), false);
    assert.equal(titles(plan, "caregiver").includes("Hill Country Home Care"), false);
  }
  assert.match(flexible.comparisonNote ?? "", /Budget changed/);
  const local = (plan: typeof limited) =>
    titles(plan, "medical").filter(
      (title) => title !== "CMS Doctors and Clinicians dataset" && title !== "HRSA Find a Health Center" && title !== "Parkinson's Foundation",
    );
  assert.notEqual(local(limited)[0], "CommUnityCare Austin Resource Center for the Homeless");
  assert.equal(local(flexible)[0], "CommUnityCare Austin Resource Center for the Homeless");
});

test("a missing place does not invent local clinics", () => {
  const profile = extractProfileHeuristic({ q1: "Me", q3: "Tremor" });
  const plan = createPlan(profile, data, null).plan;
  const local = plan.medical.filter((item) => {
    const row = data.medical.find((resource) => resource.id === item.resourceId);
    return row && row.city !== "National";
  });
  assert.equal(local.length, 0);
  assert.ok(plan.missingInformation.includes("City or ZIP code"));
});

test("urgent language adds an emergency prompt and does not diagnose", () => {
  const profile = extractProfileHeuristic({ q1: "Me", q5: "I fell and could not get up." });
  const urgent = detectUrgent(profile);
  assert.equal(urgent.active, true);
  const plan = createPlan(profile, data, null).plan;
  assert.equal(plan.urgent.active, true);
  assert.match(plan.steps[0]?.title ?? "", /emergency/i);
  assert.doesNotMatch(plan.patientSummary, /diagnosis is/i);
});
