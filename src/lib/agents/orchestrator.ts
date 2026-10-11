import type { AgentMessage, CarePlan, Findings, PatientProfile } from "@/lib/schemas";
import { carePlanSchema } from "@/lib/schemas";
import type { Dataset } from "@/lib/resources";
import { completeJson } from "@/lib/llm";
import { refineCaregiver, runCaregiverAgent } from "@/lib/agents/caregiver";
import { refineEquipment, runEquipmentAgent } from "@/lib/agents/equipment";
import { refineMedical, runMedicalAgent } from "@/lib/agents/medical";
import { synthesize, synthesizerMessage } from "@/lib/agents/synthesizer";

function knownIds(data: Dataset): Set<string> {
  return new Set([
    ...data.medical.map((item) => item.id),
    ...data.equipment.map((item) => item.id),
    ...data.caregivers.map((item) => item.id),
  ]);
}

function keepKnown(findings: Findings, ids: Set<string>): Findings {
  return {
    ...findings,
    recommendations: findings.recommendations.filter(
      (item) => item.resourceId !== null && ids.has(item.resourceId),
    ),
  };
}

function roundMessages(findings: Findings, round: number): AgentMessage[] {
  const others = ["medical", "equipment", "caregiver"].filter((agent) => agent !== findings.agent);
  if (round === 1) {
    return [
      {
        sender: findings.agent,
        recipients: others,
        round: 1,
        content: findings.keyFindings.join(" "),
      },
    ];
  }
  return findings.flagsForOtherAgents.map((flag) => ({
    sender: findings.agent,
    recipients: flag.to === "all" ? others : [flag.to],
    round: 2,
    content: flag.message,
  }));
}

export function createPlan(
  profile: PatientProfile,
  data: Dataset,
  previous: CarePlan | null,
): { plan: CarePlan; messages: AgentMessage[] } {
  const ids = knownIds(data);
  const medical = keepKnown(runMedicalAgent(profile, data.medical), ids);
  const equipment = keepKnown(runEquipmentAgent(profile, data.equipment), ids);
  const caregiver = keepKnown(runCaregiverAgent(profile, data.caregivers), ids);

  const medical2 = refineMedical(medical, [equipment, caregiver], profile);
  const equipment2 = refineEquipment(equipment, [medical, caregiver], profile);
  const caregiver2 = refineCaregiver(caregiver, [medical, equipment], profile);

  const messages = [
    ...roundMessages(medical, 1),
    ...roundMessages(equipment, 1),
    ...roundMessages(caregiver, 1),
    ...roundMessages(medical2, 2),
    ...roundMessages(equipment2, 2),
    ...roundMessages(caregiver2, 2),
    synthesizerMessage(),
  ];

  const plan = synthesize(profile, medical2, equipment2, caregiver2, previous);
  return { plan, messages };
}

const polishSchema = carePlanSchema.pick({
  patientSummary: true,
  steps: true,
  medical: true,
  equipment: true,
  caregiver: true,
});

export async function polishPlan(plan: CarePlan, profile: PatientProfile): Promise<CarePlan> {
  const polished = await completeJson({
    system: [
      "Rewrite ParkCare explanations in plain language at about a 6th to 8th grade reading level.",
      "Do not add, remove, or rename resources. Keep every resourceId and title the same.",
      "Do not invent prices, phones, availability, credentials, or diagnoses.",
      "Do not give treatment orders. Say the plan is general information.",
      "Return JSON with patientSummary, steps, medical, equipment, and caregiver.",
    ].join(" "),
    user: JSON.stringify({ profile, plan }),
    schema: polishSchema,
  });
  if (!polished) return plan;
  const same =
    JSON.stringify(polished.medical.map((item) => [item.resourceId, item.title])) ===
      JSON.stringify(plan.medical.map((item) => [item.resourceId, item.title])) &&
    JSON.stringify(polished.equipment.map((item) => [item.resourceId, item.title])) ===
      JSON.stringify(plan.equipment.map((item) => [item.resourceId, item.title])) &&
    JSON.stringify(polished.caregiver.map((item) => [item.resourceId, item.title])) ===
      JSON.stringify(plan.caregiver.map((item) => [item.resourceId, item.title]));
  if (!same || polished.steps.length !== plan.steps.length) return plan;
  return {
    ...plan,
    patientSummary: polished.patientSummary,
    steps: polished.steps.map((step, index) => ({
      ...plan.steps[index],
      why: step.why,
    })),
    medical: plan.medical.map((item, index) => ({ ...item, why: polished.medical[index]?.why ?? item.why })),
    equipment: plan.equipment.map((item, index) => ({
      ...item,
      why: polished.equipment[index]?.why ?? item.why,
    })),
    caregiver: plan.caregiver.map((item, index) => ({
      ...item,
      why: polished.caregiver[index]?.why ?? item.why,
    })),
    generatedBy: "llm",
  };
}

