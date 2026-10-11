import { NextResponse } from "next/server";
import { fail, jsonError, relativeRedirect, withSession } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { budgetSchema, supportSchema } from "@/lib/schemas";
import { readSessionCookie } from "@/lib/session";
import { getProfile, getSession, runCarePlan, saveProfile } from "@/lib/db/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!rateLimit(clientKey(request, "plan"), 15)) {
      return jsonError("Too many requests. Please wait a minute and try again.", 429);
    }
    const contentType = request.headers.get("content-type") ?? "";
    let budget: string | undefined;
    let supportNeeds: string | undefined;
    let postedSession: string | undefined;
    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => ({}))) as { budget?: string; supportNeeds?: string };
      budget = body.budget;
      supportNeeds = body.supportNeeds;
    } else if (contentType.includes("form")) {
      const form = await request.formData();
      budget = String(form.get("budget") ?? "") || undefined;
      supportNeeds = String(form.get("supportNeeds") ?? "") || undefined;
      postedSession = String(form.get("sessionId") ?? "") || undefined;
    }

    const cookie = await readSessionCookie();
    const session = cookie ? await getSession(cookie) : null;
    if (!session) return jsonError("Start the questions first.", 400);
    if (postedSession && postedSession !== session.id) {
      return jsonError("You can update a plan only from the device that created it.", 403);
    }
    const existing = await getProfile(session.id);
    if (!existing) return jsonError("Check the summary before making a plan.", 400);

    const nextBudget = budget ? budgetSchema.parse(budget) : existing.profile.budget;
    const nextSupport = supportNeeds ? supportSchema.parse(supportNeeds) : existing.profile.supportNeeds;
    await saveProfile(
      session.id,
      { ...existing.profile, budget: nextBudget, supportNeeds: nextSupport },
      true,
    );
    await runCarePlan(session.id);
    if (contentType.includes("application/json")) {
      return withSession(NextResponse.json({ sessionId: session.id }), session.id, request);
    }
    return withSession(relativeRedirect(`/results/${session.id}`), session.id, request);
  } catch (error) {
    return fail(error);
  }
}
