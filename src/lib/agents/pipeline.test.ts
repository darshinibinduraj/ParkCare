import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { caregiverServices, equipmentItems, medicalResources } from "../../data/seed/catalog";
import { DEMO_SCENARIOS } from "../demo-scenarios";
import { extractProfileHeuristic } from "../extract";
import { createPlan } from "./orchestrator";
import { detectUrgent } from "./synthesizer";
import type { Dataset } from "../resources";
import type { PatientProfile } from "../schemas";

const data: Dataset = {
  medical: medicalResources,
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
  assert.ok(medicalResources.length >= 10);
  assert.ok(equipmentItems.length >= 15);
  assert.ok(caregiverServices.length >= 10);
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

test("equipment's home-safety note moves the balance clinic ahead of the other local clinic", () => {
  const { plan, messages } = createPlan(profileFor("falls-alone"), data, null);
  const note = messages
    .filter((message) => message.round === 2 && message.sender === "medical")
    .map((message) => message.content)
    .join(" ");
  assert.match(note, /Barton Creek Balance Clinic/);
  assert.match(note, /ahead of Austin Community Neurology Clinic/);
  const titles = plan.medical.map((item) => item.title);
  const balance = titles.indexOf("Barton Creek Balance Clinic");
  const community = titles.indexOf("Austin Community Neurology Clinic");
  assert.ok(balance >= 0 && community >= 0 && balance < community);
});

test("budget changes which equipment and caregiver examples appear", () => {
  const base = profileFor("falls-alone");
  const limited = createPlan(base, data, null).plan;
  const flexible = createPlan({ ...base, budget: "flexible" }, data, limited).plan;
  const limitedNames = new Set(titles(limited, "equipment"));
  assert.equal(limitedNames.has("Rolling walker"), false);
  assert.equal(limitedNames.has("Shower chair"), false);
  assert.ok(titles(flexible, "equipment").includes("Rolling walker"));
  assert.match(flexible.comparisonNote ?? "", /Budget changed/);
  assert.equal(titles(limited, "caregiver").includes("Hill Country Home Care"), false);
  assert.ok(titles(flexible, "caregiver").includes("Hill Country Home Care"));
  const place = (plan: typeof limited, title: string) => titles(plan, "medical").indexOf(title);
  assert.ok(place(limited, "Austin Community Neurology Clinic") < place(limited, "Lone Star Movement Center"));
  assert.ok(place(flexible, "Lone Star Movement Center") < place(flexible, "Austin Community Neurology Clinic"));
});

test("a missing place does not invent local clinics", () => {
  const profile = extractProfileHeuristic({ q1: "Me", q3: "Tremor" });
  const plan = createPlan(profile, data, null).plan;
  const local = plan.medical.filter((item) => medicalResources.find((row) => row.id === item.resourceId && row.simulated));
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
