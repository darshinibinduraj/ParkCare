import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { caregiverServices, equipmentItems, medicalResources } from "@/lib/db/schema";
import type { AppDatabase } from "@/lib/db/client";
import {
  caregiverServices as caregiverFallback,
  equipmentItems as equipmentFallback,
  medicalResources as medicalFallback,
} from "@/data/seed/catalog";
import type { CaregiverService, EquipmentItem, MedicalResource } from "@/lib/resources";

function readSeed<T>(fileName: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "src/data/seed", fileName), "utf8")) as T;
  } catch {
    return fallback;
  }
}

function assertTrustFlags(name: string, verified: boolean, simulated: boolean) {
  if (verified === simulated) {
    throw new Error(`Resource "${name}" must be either verified or simulated.`);
  }
}

export async function seedIfEmpty(db: AppDatabase): Promise<void> {
  const existing = await db.select({ id: medicalResources.id }).from(medicalResources).limit(1);
  if (existing.length > 0) return;
  await replaceSeed(db);
}

export async function replaceSeed(db: AppDatabase): Promise<void> {
  const medicalSeed = readSeed<MedicalResource[]>("medical.json", medicalFallback);
  const equipmentSeed = readSeed<EquipmentItem[]>("equipment.json", equipmentFallback);
  const caregiverSeed = readSeed<CaregiverService[]>("caregivers.json", caregiverFallback);
  for (const row of medicalSeed) assertTrustFlags(row.name, row.verified, row.simulated);
  for (const row of equipmentSeed) assertTrustFlags(row.name, row.verified, row.simulated);
  for (const row of caregiverSeed) assertTrustFlags(row.name, row.verified, row.simulated);

  await db.delete(caregiverServices);
  await db.delete(equipmentItems);
  await db.delete(medicalResources);

  await db.insert(medicalResources).values(
    medicalSeed.map((row) => ({
      ...row,
      lastVerified: row.lastVerified,
    })),
  );
  await db.insert(equipmentItems).values(
    equipmentSeed.map((row) => ({
      ...row,
      estimatedPriceUsd: row.estimatedPriceUsd === null ? null : row.estimatedPriceUsd.toFixed(2),
    })),
  );
  await db.insert(caregiverServices).values(caregiverSeed);
}

export async function countResources(db: AppDatabase): Promise<number> {
  const rows = await db
    .select({ id: medicalResources.id })
    .from(medicalResources)
    .where(eq(medicalResources.simulated, true));
  return rows.length;
}
