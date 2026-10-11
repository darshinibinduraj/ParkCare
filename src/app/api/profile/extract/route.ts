import { NextResponse } from "next/server";
import { fail, jsonError, withSession } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { readSessionCookie } from "@/lib/session";
import { getSession, syncProfile } from "@/lib/db/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!rateLimit(clientKey(request, "extract"), 20)) {
      return jsonError("Too many requests. Please wait a minute and try again.", 429);
    }
    const cookie = await readSessionCookie();
    const session = cookie ? await getSession(cookie) : null;
    if (!session) return jsonError("Start the questions first.", 400);
    const profile = await syncProfile(session.id);
    return withSession(NextResponse.json({ profile }), session.id, request);
  } catch (error) {
    return fail(error);
  }
}
