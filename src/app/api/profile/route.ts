import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, jsonError, withSession } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { patientProfileSchema, profileEditSchema } from "@/lib/schemas";
import { readSessionCookie } from "@/lib/session";
import { getProfile, getSession, saveProfile } from "@/lib/db/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = profileEditSchema.extend({ confirm: z.boolean().optional() });

export async function PUT(request: Request) {
  try {
    if (!rateLimit(clientKey(request, "profile"), 30)) {
      return jsonError("Too many requests. Please wait a minute and try again.", 429);
    }
    const cookie = await readSessionCookie();
    const session = cookie ? await getSession(cookie) : null;
    if (!session) return jsonError("Start the questions first.", 400);
    const existing = await getProfile(session.id);
    if (!existing) return jsonError("We do not have a summary yet. Go back to the questions.", 400);
    const body = bodySchema.parse(await request.json());
    const { confirm, ...edits } = body;
    const blank = (value: string | null) => {
      const trimmed = value?.trim() ?? "";
      return trimmed ? trimmed : null;
    };
    edits.stage = edits.stage.trim() || "unknown";
    edits.homeEnvironment = blank(edits.homeEnvironment);
    edits.currentMobilitySupport = blank(edits.currentMobilitySupport);
    edits.falls.frequency = edits.falls.reported ? blank(edits.falls.frequency) : null;
    edits.location.cityOrZip = blank(edits.location.cityOrZip);
    edits.preferences = {
      caregiverGender: blank(edits.preferences.caregiverGender),
      language: blank(edits.preferences.language),
      schedule: blank(edits.preferences.schedule),
      other: blank(edits.preferences.other),
    };
    const profile = patientProfileSchema.parse({
      ...edits,
      rawAnswers: existing.profile.rawAnswers,
      sourceHash: existing.profile.sourceHash,
      extractionMethod: existing.profile.extractionMethod,
    });
    await saveProfile(session.id, profile, Boolean(confirm));
    return withSession(NextResponse.json({ profile }), session.id, request);
  } catch (error) {
    return fail(error);
  }
}
