import type { Findings, PatientProfile } from "@/lib/schemas";
import { findingsSchema } from "@/lib/schemas";
import { SYMPTOM_LABEL } from "@/lib/copy";
import { isNational, locationMatches, type MedicalResource } from "@/lib/resources";

function exactZip(profile: PatientProfile, resource: MedicalResource): boolean {
  const zip = profile.location.cityOrZip?.match(/\b\d{5}\b/)?.[0];
  return Boolean(zip && resource.zip.slice(0, 5) === zip);
}

function weakerSite(resource: MedicalResource): boolean {
  return /homeless|school|mobile|seasonal/i.test(`${resource.name} ${resource.specialty}`);
}

function generalClinic(resource: MedicalResource): boolean {
  return resource.specialty === "Community health center" && !weakerSite(resource);
}

function why(resource: MedicalResource): string {
  if (isNational(resource.city)) {
    return `${resource.name} is a public source. It does not show open appointments or which insurance is accepted. Use it to look people up, then ask your care team. This is not a diagnosis.`;
  }
  return `${resource.name} is a health center site from the HRSA Health Center Service Delivery and Look-Alike Sites file, in ${resource.city}, ${resource.state}. It is a community clinic, not a Parkinson's specialist. ParkCare did not check appointments or insurance. This is not a referral.`;
}

export function runMedicalAgent(profile: PatientProfile, resources: MedicalResource[]): Findings {
  const national = resources.filter((resource) => resource.verified && isNational(resource.city));
  const local = resources
    .filter((resource) => resource.verified && !isNational(resource.city))
    .filter((resource) => locationMatches(profile.location.cityOrZip, resource))
    .sort(
      (a, b) =>
        Number(exactZip(profile, b)) - Number(exactZip(profile, a)) || a.name.localeCompare(b.name),
    );

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
        : "Location was not provided, so nearby health center sites were left out.",
      "No diagnosis or treatment was chosen.",
    ],
    recommendations: chosen.map((resource, index) => ({
      resourceId: resource.id,
      title: resource.name,
      why: why(resource),
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
      "Health center sites come from the HRSA file. They are community clinics, not a specialist referral.",
      profile.location.cityOrZip
        ? "A city or ZIP match only means the site address is in that place."
        : "Add a city or ZIP to see nearby health center sites.",
    ],
  });
}

export function refineMedical(
  own: Findings,
  others: Findings[],
  profile: PatientProfile,
  resources: MedicalResource[] = [],
): Findings {
  const heard = others.flatMap((agent) => agent.keyFindings).join(" ");
  const flags = [...own.flagsForOtherAgents];
  const equipment = others.find((agent) => agent.agent === "equipment");
  const caregiver = others.find((agent) => agent.agent === "caregiver");
  const homeSafety = (equipment?.flagsForOtherAgents ?? []).some((flag) => /home-safety|home safety/i.test(flag.message));
  const tightBudget = (caregiver?.flagsForOtherAgents ?? []).some((flag) => /budget is limited/i.test(flag.message));
  let recommendations = own.recommendations;
  if (homeSafety && tightBudget && profile.falls.reported) {
    const byId = new Map(resources.map((resource) => [resource.id, resource]));
    const resourceFor = (id: string | null) => (id ? byId.get(id) : undefined);
    const national = recommendations.filter((item) => isNational(resourceFor(item.resourceId)?.city ?? ""));
    const local = recommendations.filter((item) => {
      const resource = resourceFor(item.resourceId);
      return resource && !isNational(resource.city);
    });
    const better = local.find((item) => {
      const resource = resourceFor(item.resourceId);
      return resource ? generalClinic(resource) : false;
    });
    const weaker = local.find((item) => {
      const resource = resourceFor(item.resourceId);
      return resource ? weakerSite(resource) : false;
    });
    if (better?.resourceId && weaker?.resourceId) {
      const betterAt = local.findIndex((item) => item.resourceId === better.resourceId);
      const weakerAt = local.findIndex((item) => item.resourceId === weaker.resourceId);
      if (weakerAt < betterAt) {
        const rest = local.filter((item) => item.resourceId !== better.resourceId);
        flags.unshift({
          to: "all",
          message: `I moved ${better.title} ahead of ${weaker.title} because the equipment helper said home safety matters after a fall. This is not a referral.`,
        });
        recommendations = [...national, better, ...rest];
      }
    }
  }
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
  return { ...own, recommendations, flagsForOtherAgents: flags.slice(0, 8) };
}
