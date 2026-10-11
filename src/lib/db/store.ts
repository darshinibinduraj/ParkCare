import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  agentMessages,
  agentRuns,
  carePlans,
  caregiverServices,
  equipmentItems,
  intakeAnswers,
  medicalResources,
  patientProfiles,
  sessions,
} from "@/lib/db/schema";
import { getDb } from "@/lib/db/client";
import { extractProfile, hashAnswers } from "@/lib/extract";
import { requestAgentPlan } from "@/lib/agent-client";
import { createPlan, polishPlan } from "@/lib/agents/orchestrator";
import type { AgentMessage, CarePlan, PatientProfile } from "@/lib/schemas";
import { agentMessageSchema, carePlanSchema, patientProfileSchema } from "@/lib/schemas";
import type { CaregiverService, Dataset, EquipmentItem, MedicalResource } from "@/lib/resources";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function dateOnly(value: Date | string | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function money(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export async function createSession(prefs?: { textSize?: string | null; theme?: string | null }) {
  const db = await getDb();
  const id = randomUUID();
  const now = new Date();
  await db.insert(sessions).values({
    id,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    textSize: prefs?.textSize ?? null,
    theme: prefs?.theme ?? null,
  });
  return id;
}

export async function getSession(id: string) {
  const db = await getDb();
  const rows = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;
  if (asDate(row.expiresAt).getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  return row;
}

export async function updateSessionPrefs(
  id: string,
  prefs: { textSize?: string | null; theme?: string | null },
) {
  const db = await getDb();
  await db
    .update(sessions)
    .set({
      ...(prefs.textSize !== undefined ? { textSize: prefs.textSize } : {}),
      ...(prefs.theme !== undefined ? { theme: prefs.theme } : {}),
    })
    .where(eq(sessions.id, id));
}

export async function deleteSession(id: string) {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.id, id));
}

export async function upsertAnswer(
  sessionId: string,
  questionKey: string,
  answerText: string,
  skipped: boolean,
) {
  const db = await getDb();
  const now = new Date();
  await db
    .insert(intakeAnswers)
    .values({
      id: randomUUID(),
      sessionId,
      questionKey,
      answerText,
      skipped,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [intakeAnswers.sessionId, intakeAnswers.questionKey],
      set: { answerText, skipped, updatedAt: now },
    });
}

export async function getAnswerRows(sessionId: string) {
  const db = await getDb();
  return db.select().from(intakeAnswers).where(eq(intakeAnswers.sessionId, sessionId));
}

export async function getAnswerMap(sessionId: string): Promise<Record<string, string>> {
  const rows = await getAnswerRows(sessionId);
  const answers: Record<string, string> = {};
  for (const row of rows) {
    answers[row.questionKey] = row.skipped ? "" : row.answerText;
  }
  return answers;
}

export async function saveProfile(sessionId: string, profile: PatientProfile, confirmed: boolean) {
  const db = await getDb();
  const parsed = patientProfileSchema.parse(profile);
  await db
    .insert(patientProfiles)
    .values({
      id: randomUUID(),
      sessionId,
      profile: parsed,
      confirmed,
      createdAt: new Date(),
    })
    .onConflictDoUpdate({
      target: patientProfiles.sessionId,
      set: { profile: parsed, confirmed },
    });
  return parsed;
}

export async function getProfile(sessionId: string) {
  const db = await getDb();
  const rows = await db.select().from(patientProfiles).where(eq(patientProfiles.sessionId, sessionId)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    profile: patientProfileSchema.parse(row.profile),
    confirmed: row.confirmed,
  };
}

export async function syncProfile(sessionId: string): Promise<PatientProfile> {
  const answers = await getAnswerMap(sessionId);
  const hash = hashAnswers(answers);
  const existing = await getProfile(sessionId);
  if (existing && existing.profile.sourceHash === hash) return existing.profile;
  const extracted = await extractProfile(answers);
  extracted.sourceHash = hash;
  return saveProfile(sessionId, extracted, false);
}

async function loadDataset(): Promise<Dataset> {
  const db = await getDb();
  const medicalRows = await db.select().from(medicalResources);
  const equipmentRows = await db.select().from(equipmentItems);
  const caregiverRows = await db.select().from(caregiverServices);
  const medical: MedicalResource[] = medicalRows.map((row) => ({
    ...row,
    lastVerified: dateOnly(row.lastVerified),
  }));
  const equipment: EquipmentItem[] = equipmentRows.map((row) => ({
    ...row,
    estimatedPriceUsd: money(row.estimatedPriceUsd),
    lastVerified: dateOnly(row.lastVerified),
  }));
  const caregivers: CaregiverService[] = caregiverRows.map((row) => ({
    ...row,
    serviceArea: row.serviceArea ?? [],
    assistanceTypes: row.assistanceTypes ?? [],
    languages: row.languages ?? [],
    lastVerified: dateOnly(row.lastVerified),
  }));
  return { medical, equipment, caregivers };
}

export async function getLatestPlan(sessionId: string): Promise<CarePlan | null> {
  const view = await getPlanView(sessionId);
  return view?.plan ?? null;
}

export async function runCarePlan(sessionId: string) {
  const saved = await getProfile(sessionId);
  if (!saved) throw new Error("missing_profile");
  const previous = await getLatestPlan(sessionId);
  const data = await loadDataset();
  const remote = await requestAgentPlan(saved.profile, data, previous);
  const built = remote ?? { ...createPlan(saved.profile, data, previous), transport: "local-fallback" as const };
  const plan = await polishPlan(built.plan, saved.profile);
  const messages = built.messages.map((message) => ({
    ...message,
    structured: { ...(message.structured ?? {}), transport: built.transport },
  }));
  await saveRun(sessionId, messages, plan);
  if (!saved.confirmed) await saveProfile(sessionId, saved.profile, true);
  return plan;
}

async function saveRun(sessionId: string, messages: AgentMessage[], plan: CarePlan) {
  const db = await getDb();
  const runId = randomUUID();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(agentRuns).values({
      id: runId,
      sessionId,
      status: "complete",
      startedAt: now,
      finishedAt: now,
    });
    if (messages.length > 0) {
      await tx.insert(agentMessages).values(
        messages.map((message) => ({
          id: randomUUID(),
          runId,
          sender: message.sender,
          recipients: message.recipients,
          round: message.round,
          content: message.content,
          structured: message.structured ?? null,
          createdAt: now,
        })),
      );
    }
    await tx.insert(carePlans).values({
      id: randomUUID(),
      runId,
      plan,
      caveats: plan.caveats,
      createdAt: now,
    });
  });
}

export type ResourceCard = {
  id: string;
  kind: "medical" | "equipment" | "caregiver";
  name: string;
  detail: string;
  description: string;
  where: string;
  phone: string | null;
  website: string | null;
  priceLabel: string | null;
  source: string;
  verified: boolean;
  simulated: boolean;
  lastVerified: string | null;
  extra: string | null;
};

export type PlanView = {
  sessionId: string;
  plan: CarePlan;
  messages: AgentMessage[];
  resources: Record<string, ResourceCard>;
  profile: PatientProfile;
};

export async function getPlanView(sessionId: string): Promise<PlanView | null> {
  const db = await getDb();
  const runs = await db
    .select()
    .from(agentRuns)
    .where(and(eq(agentRuns.sessionId, sessionId), eq(agentRuns.status, "complete")))
    .orderBy(desc(agentRuns.startedAt))
    .limit(1);
  const run = runs[0];
  if (!run) return null;
  const planRows = await db.select().from(carePlans).where(eq(carePlans.runId, run.id)).limit(1);
  const planRow = planRows[0];
  if (!planRow) return null;
  const messageRows = await db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.runId, run.id))
    .orderBy(agentMessages.round, agentMessages.createdAt);
  const profileRow = await getProfile(sessionId);
  if (!profileRow) return null;
  const data = await loadDataset();
  const resources: Record<string, ResourceCard> = {};
  for (const item of data.medical) {
    resources[item.id] = {
      id: item.id,
      kind: "medical",
      name: item.name,
      detail: item.specialty,
      description: item.insuranceNotes ?? "No extra notes.",
      where: [item.address, item.city, item.state, item.zip].filter(Boolean).join(", "),
      phone: item.phone,
      website: item.website,
      priceLabel: null,
      source: item.source,
      verified: item.verified,
      simulated: item.simulated,
      lastVerified: item.lastVerified,
      extra: item.bookingUrl ? `Booking link on file: ${item.bookingUrl}` : null,
    };
  }
  for (const item of data.equipment) {
    resources[item.id] = {
      id: item.id,
      kind: "equipment",
      name: item.name,
      detail: item.category,
      description: item.description,
      where: item.intendedUse,
      phone: null,
      website: item.productUrl,
      priceLabel:
        item.estimatedPriceUsd === null
          ? null
          : `Simulated estimate: about $${item.estimatedPriceUsd}`,
      source: item.source,
      verified: item.verified,
      simulated: item.simulated,
      lastVerified: item.lastVerified,
      extra: item.safetyNotes,
    };
  }
  for (const item of data.caregivers) {
    resources[item.id] = {
      id: item.id,
      kind: "caregiver",
      name: item.name,
      detail: item.assistanceTypes.join(", ").replaceAll("_", " "),
      description: item.qualifications ?? "No extra notes.",
      where: [item.address, item.city, item.state, item.zip].filter(Boolean).join(", "),
      phone: item.phone,
      website: item.website,
      priceLabel: item.publishedRate,
      source: item.source,
      verified: item.verified,
      simulated: item.simulated,
      lastVerified: item.lastVerified,
      extra: [item.hours, item.languages.length ? `Languages listed: ${item.languages.join(", ")}` : null]
        .filter(Boolean)
        .join(" "),
    };
  }
  return {
    sessionId,
    plan: carePlanSchema.parse(planRow.plan),
    messages: messageRows.map((row) => ({
      sender: row.sender as AgentMessage["sender"],
      recipients: row.recipients,
      round: row.round,
      content: row.content,
      structured: agentMessageSchema.shape.structured.parse(row.structured),
    })),
    resources,
    profile: profileRow.profile,
  };
}
