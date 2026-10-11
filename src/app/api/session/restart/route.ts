import { NextResponse } from "next/server";
import { withSession } from "@/lib/http";
import { readSessionCookie } from "@/lib/session";
import { createSession, getSession, sessionHasPlan } from "@/lib/db/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookie = await readSessionCookie();
  const existing = cookie ? await getSession(cookie) : null;
  if (existing && !(await sessionHasPlan(existing.id))) {
    return NextResponse.redirect(new URL("/intake", request.url), 303);
  }
  const sessionId = await createSession({
    textSize: existing?.textSize,
    theme: existing?.theme,
  });
  return withSession(NextResponse.redirect(new URL("/intake", request.url), 303), sessionId, request);
}
