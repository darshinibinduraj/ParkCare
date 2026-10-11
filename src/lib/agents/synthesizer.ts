import { DISCLAIMER, LIVING_LABEL, SUPPORT_LABEL, SYMPTOM_LABEL, BUDGET_LABEL } from "@/lib/copy";
import type { AgentMessage, CarePlan, Findings, PatientProfile } from "@/lib/schemas";
import { carePlanSchema } from "@/lib/schemas";

const URGENT_PATTERNS = [
  /could not get up|couldn't get up|cannot get up|can't get up/i,
  /hit (my |their |his |her |our )?head/i,
  /chest pain/i,
  /trouble breathing|shortness of breath|cannot breathe|can't breathe/i,
  /face (is )?droop/i,
  /passed out|loss of consciousness|unconscious/i,
  /suicidal|kill myself|want to die|end my life/i,
  /heavy bleeding|won't stop bleeding/i,
];

export function detectUrgent(profile: PatientProfile): { active: boolean; message: string } {
  const blob = Object.values(profile.rawAnswers).join("\n");
  const active = URGENT_PATTERNS.some((pattern) => pattern.test(blob));
  return {
    active,
    message: active
      ? "Some of the words in the answers sound urgent. If this is happening now, contact emergency services (911 in the U.S.). If someone may be in crisis, call or text 988. ParkCare cannot assess emergencies."
      : "",
  };
}

function recommendationIds(plan: CarePlan): string[] {
  return [...plan.medical, ...plan.equipment, ...plan.caregiver]
    .map((item) => item.resourceId)
    .filter((id): id is string => Boolean(id));
}

export function buildComparisonNote(previous: CarePlan | null, next: CarePlan): string | null {
  if (!previous) return null;
  const budgetChanged = previous.inputs.budget !== next.inputs.budget;
  const supportChanged = previous.inputs.supportNeeds !== next.inputs.supportNeeds;
  const placeChanged = previous.inputs.location !== next.inputs.location;
  if (!budgetChanged && !supportChanged && !placeChanged) {
    return "The main inputs did not change. The plan was rebuilt from the same answers.";
  }
  const previousIds = new Set(recommendationIds(previous));
  const nextIds = new Set(recommendationIds(next));
  const added = [...next.medical, ...next.equipment, ...next.caregiver]
    .filter((item) => item.resourceId && !previousIds.has(item.resourceId))
    .map((item) => item.title);
  const removed = [...previous.medical, ...previous.equipment, ...previous.caregiver]
    .filter((item) => item.resourceId && !nextIds.has(item.resourceId))
    .map((item) => item.title);
  const lines = [
    budgetChanged
      ? `Budget changed from ${BUDGET_LABEL[previous.inputs.budget]} to ${BUDGET_LABEL[next.inputs.budget]}.`
      : "",
    supportChanged
      ? `Help needed changed from ${SUPPORT_LABEL[previous.inputs.supportNeeds]} to ${SUPPORT_LABEL[next.inputs.supportNeeds]}.`
      : "",
    placeChanged ? "The city or ZIP changed, so local examples were looked up again." : "",
    added.length ? `Added: ${added.join("; ")}.` : "",
    removed.length ? `Removed: ${removed.join("; ")}.` : "",
  ].filter(Boolean);
  return lines.join(" ");
}

function patientSummary(profile: PatientProfile): string {
  const who =
    profile.respondentType === "caregiver"
      ? "This plan is for someone you care for."
      : profile.respondentType === "patient"
        ? "This plan is for you."
        : "This plan is based on the answers provided.";
  const symptoms = profile.symptoms.length
    ? profile.symptoms.map((symptom) => SYMPTOM_LABEL[symptom]).join(", ")
    : "changes were not listed";
  const place = profile.location.cityOrZip ?? "a place was not given";
  return `${who} Noted: ${symptoms}. ${LIVING_LABEL[profile.livingSituation]}. Help: ${SUPPORT_LABEL[profile.supportNeeds]}. Place: ${place}. Budget: ${BUDGET_LABEL[profile.budget]}.`;
}

export function synthesize(
  profile: PatientProfile,
  medical: Findings,
  equipment: Findings,
  caregiver: Findings,
  previous: CarePlan | null,
): CarePlan {
  const urgent = detectUrgent(profile);
  const steps: CarePlan["steps"] = [];
  if (urgent.active) {
    steps.push({
      priority: 1,
      title: "Get help now if this is an emergency",
      why: urgent.message,
      agents: ["medical"],
    });
  }

  const directory = medical.recommendations.find((item) => /directory|health center|Parkinson/i.test(item.title));
  steps.push({
    priority: steps.length + 1,
    title: "Find a clinician to talk with",
    why:
      directory?.why ??
      "Use a public directory to look up clinicians. ParkCare does not book visits or choose treatment.",
    agents: ["medical"],
  });

  const firstEquipment = equipment.recommendations[0];
  if (firstEquipment) {
    steps.push({
      priority: steps.length + 1,
      title: `Home and daily-living idea: ${firstEquipment.title}`,
      why: firstEquipment.why,
      agents: ["equipment"],
    });
  }
  const secondEquipment = equipment.recommendations.find((item) => item.resourceId !== firstEquipment?.resourceId);
  if (secondEquipment && equipment.recommendations.length > 1) {
    steps.push({
      priority: steps.length + 1,
      title: `Another idea to discuss: ${secondEquipment.title}`,
      why: secondEquipment.why,
      agents: ["equipment"],
    });
  }

  const firstCare = caregiver.recommendations[0];
  if (firstCare) {
    steps.push({
      priority: steps.length + 1,
      title: `Support option to explore: ${firstCare.title}`,
      why: firstCare.why,
      agents: ["caregiver"],
    });
  }

  steps.push({
    priority: steps.length + 1,
    title: "Bring this plan to your care team",
    why: "A clinician, and a physical or occupational therapist if movement or equipment is involved, can say what fits. ParkCare cannot decide treatment or prescribe devices.",
    agents: ["medical", "equipment", "caregiver"],
  });

  const missing: string[] = [];
  if (!profile.location.cityOrZip) missing.push("City or ZIP code");
  if (profile.stage === "unknown") missing.push("Parkinson's stage");
  if (profile.budget === "unknown") missing.push("Budget");
  if (profile.supportNeeds === "unknown") missing.push("How much help is needed");
  if (profile.livingSituation === "unknown") missing.push("Who is at home");
  if (profile.symptoms.length === 0) missing.push("Movement or daily-life changes");
  if (profile.symptomFrequency === "unknown") missing.push("How often the changes happen");

  const caveats = [
    ...new Set([
      ...medical.uncertainties,
      ...equipment.uncertainties,
      ...caregiver.uncertainties,
      DISCLAIMER,
      "Confirm openings, prices, and credentials before you decide. ParkCare does not book visits or sell products.",
      "Verified rows link to a public source. ParkCare did not confirm that a person or product is available.",
    ]),
  ];

  const draft: CarePlan = {
    patientSummary: patientSummary(profile),
    steps: steps.map((step, index) => ({ ...step, priority: index + 1 })),
    medical: medical.recommendations,
    equipment: equipment.recommendations,
    caregiver: caregiver.recommendations,
    caveats,
    missingInformation: missing,
    urgent,
    comparisonNote: null,
    generatedBy: "builtin",
    inputs: {
      budget: profile.budget,
      supportNeeds: profile.supportNeeds,
      location: profile.location.cityOrZip,
    },
  };
  draft.comparisonNote = buildComparisonNote(previous, draft);
  return carePlanSchema.parse(draft);
}

export function synthesizerMessage(): AgentMessage {
  return {
    sender: "synthesizer",
    recipients: ["medical", "equipment", "caregiver"],
    round: 3,
    content:
      "I combined the medical, equipment, and caregiver findings into one ordered plan. Nothing here is a diagnosis or a prescription.",
  };
}
