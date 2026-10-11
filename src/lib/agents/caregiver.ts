import type { Findings, PatientProfile } from "@/lib/schemas";
import { findingsSchema } from "@/lib/schemas";
import { LIVING_LABEL, SUPPORT_LABEL } from "@/lib/copy";
import { isNational, locationMatches, type CaregiverService } from "@/lib/resources";

const NEED_TYPES: Record<PatientProfile["supportNeeds"], string[]> = {
  occasional: ["companionship", "housekeeping", "information", "referral"],
  daily: ["personal_care", "medication_reminders", "mobility_help", "companionship"],
  frequent: ["personal_care", "mobility_help", "respite", "medication_reminders"],
  unknown: ["information", "referral", "companionship"],
};

function isLowerCost(service: CaregiverService): boolean {
  return /sliding|lower cost|free public/i.test(service.publishedRate ?? "");
}

function overlap(service: CaregiverService, profile: PatientProfile): boolean {
  const needs = new Set(NEED_TYPES[profile.supportNeeds]);
  return service.assistanceTypes.some((type) => needs.has(type));
}

function languageScore(service: CaregiverService, profile: PatientProfile): number {
  const wanted = profile.preferences.language?.toLowerCase() ?? "";
  if (!wanted) return 0;
  return service.languages.some((language) => wanted.includes(language.toLowerCase())) ? 5 : 0;
}

function facilityScore(service: CaregiverService, profile: PatientProfile): number {
  if (profile.livingSituation !== "care_facility") return 0;
  const blob = `${service.qualifications ?? ""} ${service.hours ?? ""} ${service.name}`;
  return /care community/i.test(blob) ? 4 : 0;
}

export function runCaregiverAgent(profile: PatientProfile, services: CaregiverService[]): Findings {
  const national = services.filter((service) => service.verified && isNational(service.city));
  let local = services.filter(
    (service) =>
      service.simulated &&
      overlap(service, profile) &&
      locationMatches(profile.location.cityOrZip, service),
  );
  const lower = local.filter(isLowerCost);
  if (profile.budget === "limited" && lower.length > 0) local = lower;
  local.sort((a, b) => {
    const scoreA = languageScore(a, profile) + facilityScore(a, profile) + (profile.budget === "flexible" && !isLowerCost(a) ? 2 : 0);
    const scoreB = languageScore(b, profile) + facilityScore(b, profile) + (profile.budget === "flexible" && !isLowerCost(b) ? 2 : 0);
    return scoreB - scoreA || a.name.localeCompare(b.name);
  });

  const chosen = [...local, ...national].slice(0, 8);
  return findingsSchema.parse({
    agent: "caregiver",
    keyFindings: [
      `${LIVING_LABEL[profile.livingSituation]}. Help needed: ${SUPPORT_LABEL[profile.supportNeeds]}.`,
      profile.location.cityOrZip
        ? `Looking for example support near ${profile.location.cityOrZip}.`
        : "No city or ZIP, so only national public lookup services are listed.",
      profile.preferences.language
        ? `Language preference noted: ${profile.preferences.language}.`
        : "No language preference was provided.",
      "Support options were not contacted. National helplines are public services. Availability was not checked.",
    ],
    recommendations: chosen.map((service, index) => ({
      resourceId: service.id,
      title: service.name,
      why: service.verified
        ? `${service.name} is a real public information service. It does not assign a caregiver. Ask them what is available near you.`
        : `${service.name} matches this place and ${SUPPORT_LABEL[profile.supportNeeds].toLowerCase()}. Ask about openings, cost, language, and training before you decide.`,
      priority: service.simulated ? (index === 0 ? 1 : 2) : 3,
    })),
    flagsForOtherAgents: [
      {
        to: "all",
        message:
          profile.livingSituation === "care_facility"
            ? "They live in a care community. Support should coordinate with that community, not assume a private home."
            : profile.livingSituation === "alone" && profile.falls.reported
              ? "This person lives alone and falls were reported. In-home support is worth discussing. Availability was not checked."
              : "Support ideas are examples only. I did not confirm that anyone is available.",
      },
      ...(profile.budget === "limited"
        ? [
            {
              to: "medical" as const,
              message:
                "Budget is limited. Please put a lower-cost community or balance option ahead of a specialty center.",
            },
          ]
        : []),
    ],
    uncertainties: [
      "Credentials, background checks, and open hours were not verified.",
      profile.preferences.caregiverGender
        ? `A preference for a ${profile.preferences.caregiverGender.toLowerCase()} caregiver was noted. Staff gender is not in the dataset, so it was not used as a filter.`
        : "Caregiver gender was not requested.",
      profile.budget === "limited"
        ? "Limited budget: higher-priced example agencies were hidden when a lower-cost example exists."
        : "Published rates are estimates, not quotes.",
    ],
  });
}

export function refineCaregiver(own: Findings, others: Findings[], profile: PatientProfile): Findings {
  const equipment = others.find((agent) => agent.agent === "equipment");
  const flags = [...own.flagsForOtherAgents];
  if (equipment) {
    flags.push({
      to: "equipment",
      message:
        "Home changes may reduce how much hands-on help is needed. They do not replace people when someone wants in-person support.",
    });
  }
  if (profile.budget === "limited") {
    flags.push({
      to: "medical",
      message: "Budget is limited. Please do not imply that a specialty clinic is the only next step.",
    });
  }
  return { ...own, flagsForOtherAgents: flags.slice(0, 8) };
}
