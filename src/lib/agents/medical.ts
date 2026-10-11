import type { Findings, PatientProfile } from "@/lib/schemas";
import { findingsSchema } from "@/lib/schemas";
import { SYMPTOM_LABEL } from "@/lib/copy";
import { isNational, locationMatches, type MedicalResource } from "@/lib/resources";

function wantsMovement(profile: PatientProfile): boolean {
  return (
    profile.falls.reported ||
    profile.stage !== "unknown" ||
    profile.symptoms.some((symptom) =>
      ["tremor", "stiffness", "walking", "balance", "falls"].includes(symptom),
    )
  );
}

function score(resource: MedicalResource, profile: PatientProfile): number {
  const specialty = resource.specialty.toLowerCase();
  let value = 0;
  if ((profile.falls.reported || profile.symptoms.includes("balance")) && specialty.includes("balance")) {
    value += 50;
  }
  if (wantsMovement(profile) && specialty.includes("movement")) value += 40;
  if (specialty.includes("neurolog")) value += 30;
  if (profile.budget === "limited" && /community/i.test(resource.name)) value += 25;
  if (profile.budget === "flexible" && /movement|balance/i.test(specialty)) value += 20;
  if (profile.budget === "moderate" && specialty.includes("movement")) value += 10;
  return value;
}

function relevant(resource: MedicalResource, profile: PatientProfile): boolean {
  const specialty = resource.specialty.toLowerCase();
  if (specialty.includes("balance")) return profile.falls.reported || profile.symptoms.includes("balance");
  if (specialty.includes("movement")) return wantsMovement(profile);
  if (specialty.includes("neurolog")) return true;
  return false;
}

function why(resource: MedicalResource, profile: PatientProfile): string {
  if (resource.verified) {
    return `${resource.name} is a public source. It does not show open appointments or which insurance is accepted. Use it to look people up, then ask your care team. This is not a diagnosis.`;
  }
  const budgetNote =
    profile.budget === "limited"
      ? " Because cost is a concern, community clinic examples are listed before specialty centers."
      : profile.budget === "flexible"
        ? " Because the budget has more room, specialty examples are listed earlier. Cost still varies, and this is not a quote."
        : "";
  return `${resource.name} is a fictional clinic in the demo, placed near the city or ZIP you gave. It cannot book a visit. Many people ask about a neurologist or movement-disorder specialist for Parkinson's. Your clinician should guide that choice.${budgetNote}`;
}

export function runMedicalAgent(profile: PatientProfile, resources: MedicalResource[]): Findings {
  const national = resources.filter((resource) => resource.verified && isNational(resource.city));
  const local = resources
    .filter((resource) => resource.simulated && relevant(resource, profile))
    .filter((resource) => locationMatches(profile.location.cityOrZip, resource))
    .sort((a, b) => score(b, profile) - score(a, profile) || a.name.localeCompare(b.name));

  const chosen = [...national, ...local].slice(0, 8);
  const symptomText = profile.symptoms.length
    ? profile.symptoms.map((symptom) => SYMPTOM_LABEL[symptom]).join(", ")
    : "not provided";

  return findingsSchema.parse({
    agent: "medical",
    keyFindings: [
      `Changes noted: ${symptomText}.`,
      profile.falls.reported ? "Falls were reported." : "Falls were not reported.",
      profile.stage === "unknown" ? "Stage was not provided." : `Stage described as ${profile.stage}.`,
      profile.location.cityOrZip
        ? `Location on file: ${profile.location.cityOrZip}.`
        : "Location was not provided, so example local clinics were left out.",
      "No diagnosis or treatment was chosen.",
    ],
    recommendations: chosen.map((resource, index) => ({
      resourceId: resource.id,
      title: resource.name,
      why: why(resource, profile),
      priority: resource.verified ? 1 : index === 0 ? 1 : 2,
    })),
    flagsForOtherAgents: [
      {
        to: "all",
        message: profile.falls.reported
          ? "Falls are part of this story. Home changes and support do not replace a clinician's review."
          : "No diagnosis was made. Keep every suggestion informational.",
      },
    ],
    uncertainties: [
      "Insurance acceptance and open appointments were not checked.",
      "Example clinics are simulated. Directories are public lookup tools, not referrals.",
      profile.location.cityOrZip
        ? "A city or ZIP match only means the example was tagged for that place."
        : "Add a city or ZIP to see example local clinics.",
    ],
  });
}

export function refineMedical(own: Findings, others: Findings[], profile: PatientProfile): Findings {
  const heard = others.flatMap((agent) => agent.keyFindings).join(" ");
  const flags = [...own.flagsForOtherAgents];
  if (/fall/i.test(heard) || profile.falls.reported) {
    flags.push({
      to: "equipment",
      message: "I saw falls in the shared notes. Please keep home-safety ideas separate from medical treatment.",
    });
  }
  flags.push({
    to: "caregiver",
    message:
      profile.livingSituation === "alone"
        ? "Living alone makes a check-in plan more important. I did not assess safety."
        : "Please share support options without calling them medical treatment.",
  });
  return { ...own, flagsForOtherAgents: flags.slice(0, 8) };
}
