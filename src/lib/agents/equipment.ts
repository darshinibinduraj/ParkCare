import type { Findings, PatientProfile, Symptom } from "@/lib/schemas";
import { findingsSchema } from "@/lib/schemas";
import { BUDGET_LABEL } from "@/lib/copy";
import type { EquipmentItem } from "@/lib/resources";

const CATEGORIES: Record<Symptom | "falls_flag", string[]> = {
  tremor: ["eating", "dressing", "reach"],
  balance: ["bathroom", "lighting", "flooring", "mobility"],
  falls: ["bathroom", "lighting", "flooring", "mobility", "bed"],
  walking: ["mobility", "flooring", "lighting"],
  stiffness: ["dressing", "reach", "eating"],
  daily_activities: ["eating", "dressing", "reach", "bathroom"],
  falls_flag: ["bathroom", "lighting", "flooring", "mobility", "bed"],
};

function categoriesFor(profile: PatientProfile): Set<string> {
  const selected = new Set<string>();
  for (const symptom of profile.symptoms) {
    for (const category of CATEGORIES[symptom]) selected.add(category);
  }
  if (profile.falls.reported) {
    for (const category of CATEGORIES.falls_flag) selected.add(category);
  }
  if (selected.size === 0) {
    selected.add("lighting");
    selected.add("flooring");
  }
  return selected;
}

function priceCap(profile: PatientProfile): number {
  if (profile.budget === "flexible") return Number.POSITIVE_INFINITY;
  if (profile.budget === "moderate") return 80;
  return 40;
}

function withinBudget(item: EquipmentItem, profile: PatientProfile): boolean {
  if (item.estimatedPriceUsd === null) return true;
  return item.estimatedPriceUsd <= priceCap(profile);
}

export function runEquipmentAgent(profile: PatientProfile, items: EquipmentItem[]): Findings {
  const categories = categoriesFor(profile);
  const matching = items.filter(
    (item) => categories.has(item.category) && withinBudget(item, profile),
  );
  const chosen = matching.filter((item) => item.verified && !item.simulated).slice(0, 8);

  return findingsSchema.parse({
    agent: "equipment",
    keyFindings: [
      `Home and daily-living categories considered: ${[...categories].sort().join(", ")}.`,
      `Budget on file: ${BUDGET_LABEL[profile.budget]}. These notes are public guidance and have no price.`,
      profile.falls.reported
        ? "Falls were reported, so bathroom, lighting, floors, and walking supports were included."
        : "Falls were not reported, so fall-specific notes were not added.",
      "No device was prescribed. Every note is paraphrased guidance with a source link and no invented price.",
    ],
    recommendations: chosen.map((item) => ({
      resourceId: item.id,
      title: item.name,
      why: `${item.description} This is general guidance from the listed source, not a product recommendation. A physical or occupational therapist can say whether it fits.`,
      priority: 1,
    })),
    flagsForOtherAgents: [
      {
        to: "all",
        message: profile.falls.reported
          ? "Falls were reported. Home-safety steps may matter as much as buying a device. I am not prescribing equipment."
          : "I listed daily-living ideas only. I am not prescribing a device.",
      },
    ],
    uncertainties: [
      "These notes do not include a store price or a product to buy.",
      "A therapist should decide whether any device fits. ParkCare does not sell equipment.",
      profile.homeEnvironment
        ? `Home notes on file: ${profile.homeEnvironment}.`
        : "Home layout details were limited.",
    ],
  });
}

export function refineEquipment(
  own: Findings,
  others: Findings[],
  profile: PatientProfile,
  items: EquipmentItem[] = [],
): Findings {
  const medical = others.find((agent) => agent.agent === "medical");
  const heard = medical?.keyFindings.join(" ") ?? "";
  const flags = [...own.flagsForOtherAgents];
  let recommendations = own.recommendations;
  if (/fall/i.test(heard) || profile.falls.reported) {
    const byId = new Map(items.map((item) => [item.id, item]));
    const homeFirst = (id: string | null) => {
      const category = id ? byId.get(id)?.category : undefined;
      return category && category !== "mobility" ? 0 : 1;
    };
    const next = [...recommendations].sort((a, b) => homeFirst(a.resourceId) - homeFirst(b.resourceId));
    const moved = next[0] && recommendations[0] && next[0].resourceId !== recommendations[0].resourceId;
    flags.push({
      to: "all",
      message: moved
        ? `I moved ${next[0]?.title} ahead of ${recommendations[0]?.title} because the medical helper reported falls. Home safety comes before a walking device. I am not prescribing equipment.`
        : "Medical helper noted falls, or falls are in the story. I am keeping home-safety information ahead of buying a device.",
    });
    if (moved) recommendations = next;
  }
  if (profile.budget === "limited") {
    flags.push({
      to: "caregiver",
      message: "Budget is limited. I did not add priced products. A therapist can still discuss devices.",
    });
  }
  return { ...own, recommendations, flagsForOtherAgents: flags.slice(0, 8) };
}
