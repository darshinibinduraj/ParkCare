import { NextResponse } from "next/server";
import { fail, jsonError } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getPlanView } from "@/lib/db/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if (!rateLimit(clientKey(request, "plan-read"), 60)) {
      return jsonError("Too many requests. Please wait a minute and try again.", 429);
    }
    const { id } = await context.params;
    const view = await getPlanView(id);
    if (!view) return jsonError("No plan was found for that session.", 404);
    return NextResponse.json({
      sessionId: view.sessionId,
      plan: view.plan,
      messages: view.messages,
      profile: view.profile,
    });
  } catch (error) {
    return fail(error);
  }
}
