import { NextResponse } from "next/server";
import { fail, jsonError, withSession } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { scenarioById } from "@/lib/demo-scenarios";
import { createSession, runCarePlan, saveProfile, syncProfile, upsertAnswer } from "@/lib/db/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!rateLimit(clientKey(request, "demo"), 10)) {
      return jsonError("Too many requests. Please wait a minute and try again.", 429);
    }
    const contentType = request.headers.get("content-type") ?? "";
    let scenarioId = "";
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { scenarioId?: string };
      scenarioId = body.scenarioId ?? "";
    } else {
      const form = await request.formData();
      scenarioId = String(form.get("scenarioId") ?? "");
    }
    const scenario = scenarioById(scenarioId);
    if (!scenario) return jsonError("That demo story was not found.", 400);
    const sessionId = await createSession();
    for (const [questionKey, answerText] of Object.entries(scenario.answers)) {
      await upsertAnswer(sessionId, questionKey, answerText, false);
    }
    const profile = await syncProfile(sessionId);
    await saveProfile(sessionId, profile, true);
    await runCarePlan(sessionId);
    if (contentType.includes("application/json")) {
      return withSession(NextResponse.json({ sessionId }), sessionId, request);
    }
    return withSession(NextResponse.redirect(new URL(`/results/${sessionId}`, request.url), 303), sessionId, request);
  } catch (error) {
    return fail(error);
  }
}
