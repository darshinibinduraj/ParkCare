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
  const verified = matching.filter((item) => item.verified).slice(0, 4);
  const simulated = matching
    .filter((item) => item.simulated)
    .sort((a, b) => (a.estimatedPriceUsd ?? 0) - (b.estimatedPriceUsd ?? 0) || a.name.localeCompare(b.name))
    .slice(0, 8);
  const chosen = [...verified, ...simulated];
  const cap = priceCap(profile);

  return findingsSchema.parse({
    agent: "equipment",
    keyFindings: [
      `Home and daily-living categories considered: ${[...categories].sort().join(", ")}.`,
      Number.isFinite(cap)
        ? `Budget filter: ${BUDGET_LABEL[profile.budget]}. Example products over $${cap} were left out.`
        : "Budget filter: more flexibility, so higher-priced examples can appear. Prices are still simulated.",
      profile.falls.reported
        ? "Falls were reported, so bathroom, lighting, floors, and walking supports were included."
        : "Falls were not reported, so fall-specific products were not added.",
      "No device was prescribed. Verified rows are paraphrased guidance with a source link and no invented price.",
    ],
    recommendations: chosen.map((item, index) => ({
      resourceId: item.id,
      title: item.name,
      why: item.verified
        ? `${item.description} This is general guidance from the listed source, not a product recommendation. A physical or occupational therapist can say whether it fits.`
        : `${item.description} The price is a simulated estimate, not a store price. A therapist should help you decide before buying.`,
      priority: item.verified ? 1 : index < 2 ? 1 : 2,
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
      "Product fit, install, and real prices were not checked.",
      profile.budget === "unknown"
        ? "Budget was not provided, so higher-priced examples were left out."
        : "Changing the budget will show or hide higher-priced examples.",
      profile.homeEnvironment
        ? `Home notes on file: ${profile.homeEnvironment}.`
        : "Home layout details were limited.",
    ],
  });
}

export function refineEquipment(own: Findings, others: Findings[], profile: PatientProfile): Findings {
  const medical = others.find((agent) => agent.agent === "medical");
  const heard = medical?.keyFindings.join(" ") ?? "";
  const flags = [...own.flagsForOtherAgents];
  if (/fall/i.test(heard) || profile.falls.reported) {
    flags.push({
      to: "all",
      message:
        "Medical helper noted falls, or falls are in the story. I am keeping home-safety information ahead of buying a device.",
    });
  }
  if (profile.budget === "limited") {
    flags.push({
      to: "caregiver",
      message: "Budget is limited. I left out higher-priced example products. A therapist can still discuss them.",
    });
  }
  return { ...own, flagsForOtherAgents: flags.slice(0, 8) };
}
