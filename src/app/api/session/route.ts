import { NextResponse } from "next/server";
import { fail, jsonError, withSession } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { preferencesSchema } from "@/lib/schemas";
import { readSessionCookie } from "@/lib/session";
import { createSession, getSession, updateSessionPrefs } from "@/lib/db/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!rateLimit(clientKey(request, "session"), 60)) {
      return jsonError("Too many requests. Please wait a minute and try again.", 429);
    }
    const body = preferencesSchema.parse(await request.json().catch(() => ({})));
    const cookie = await readSessionCookie();
    const existing = cookie ? await getSession(cookie) : null;
    const sessionId = existing?.id ?? (await createSession(body));
    if (existing) await updateSessionPrefs(sessionId, body);
    return withSession(NextResponse.json({ id: sessionId }), sessionId, request);
  } catch (error) {
    return fail(error);
  }
}
