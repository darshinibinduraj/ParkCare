import { NextResponse } from "next/server";
import { fail, jsonError, withSession } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { readSessionCookie } from "@/lib/session";
import { getProfile, getSession, runCarePlan } from "@/lib/db/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encode(event: string, data: unknown): Uint8Array {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  return new TextEncoder().encode(`event: ${event}\ndata: ${payload}\n\n`);
}

export async function POST(request: Request) {
  try {
    if (!rateLimit(clientKey(request, "plan"), 15)) {
      return jsonError("Too many requests. Please wait a minute and try again.", 429);
    }
    const cookie = await readSessionCookie();
    const session = cookie ? await getSession(cookie) : null;
    if (!session) return jsonError("Start the questions first.", 400);
    const existing = await getProfile(session.id);
    if (!existing) return jsonError("Check the summary before making a plan.", 400);

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encode("progress", "Medical helper is reading the story."));
        controller.enqueue(encode("progress", "Equipment helper is reading the story."));
        controller.enqueue(encode("progress", "Caregiver helper is reading the story."));
        controller.enqueue(encode("progress", "The helpers are exchanging notes."));
        await runCarePlan(session.id);
        controller.enqueue(encode("result", { sessionId: session.id }));
        controller.close();
      },
    });
    return withSession(
      new NextResponse(stream, {
        headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
      }),
      session.id,
      request,
    );
  } catch (error) {
    return fail(error);
  }
}
