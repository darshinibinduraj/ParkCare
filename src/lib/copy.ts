import type { Budget, PatientProfile, SupportNeed } from "@/lib/schemas";

export const DISCLAIMER =
  "ParkCare provides general information, not medical advice. Talk with your care team before making medical or equipment decisions.";

export const BUDGET_LABEL: Record<Budget, string> = {
  limited: "Keeping costs low",
  moderate: "A middle range",
  flexible: "More flexibility",
  unknown: "Not provided",
};

export const SUPPORT_LABEL: Record<SupportNeed, string> = {
  occasional: "A little help sometimes",
  daily: "Help most days",
  frequent: "Help many times a day",
  unknown: "Not provided",
};

export const LIVING_LABEL = {
  alone: "Lives alone",
  with_family: "Lives with family",
  care_facility: "Lives in a care community",
  unknown: "Not provided",
} as const;

export const FREQUENCY_LABEL = {
  rarely: "Rarely",
  sometimes: "Sometimes",
  daily: "Every day",
  multiple_per_day: "Many times a day",
  unknown: "Not provided",
} as const;

export const SYMPTOM_LABEL = {
  tremor: "Tremor",
  balance: "Balance problems",
  falls: "Falls",
  walking: "Trouble walking",
  stiffness: "Stiffness",
  daily_activities: "Daily tasks are harder",
} as const;

export const AGENT_LABEL = {
  medical: "Medical helper",
  equipment: "Equipment helper",
  caregiver: "Caregiver helper",
  synthesizer: "Plan writer",
} as const;

export function respondentLabel(profile: PatientProfile): string {
  if (profile.respondentType === "caregiver") return "Someone you care for";
  if (profile.respondentType === "patient") return "You";
  return "Not provided";
}

export function summaryLines(profile: PatientProfile): string[] {
  const who =
    profile.respondentType === "caregiver"
      ? "This plan is for someone you care for."
      : profile.respondentType === "patient"
        ? "This plan is for you."
        : "We do not know who this plan is for yet.";
  const symptoms = profile.symptoms.length
    ? profile.symptoms.map((item) => SYMPTOM_LABEL[item]).join(", ")
    : "Not provided";
  const place = profile.location.cityOrZip ?? "Not provided";
  const prefs = [
    profile.preferences.caregiverGender,
    profile.preferences.language,
    profile.preferences.schedule,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    who,
    `Stage: ${profile.stage === "unknown" ? "Not provided" : profile.stage}.`,
    `Changes noted: ${symptoms}.`,
    `How often: ${FREQUENCY_LABEL[profile.symptomFrequency]}.`,
    profile.falls.reported
      ? `Falls: yes${profile.falls.frequency ? ` (${profile.falls.frequency})` : ""}.`
      : "Falls: not reported.",
    `${LIVING_LABEL[profile.livingSituation]}. Help needed: ${SUPPORT_LABEL[profile.supportNeeds]}.`,
    `Place: ${place}. Budget: ${BUDGET_LABEL[profile.budget]}.`,
    `Preferences: ${prefs || "Not provided"}.`,
  ];
}
