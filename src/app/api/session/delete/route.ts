import { clearSession, fail, jsonError, relativeRedirect } from "@/lib/http";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { readSessionCookie } from "@/lib/session";
import { deleteSession, getSession } from "@/lib/db/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!rateLimit(clientKey(request, "delete"), 10)) {
      return jsonError("Too many requests. Please wait a minute and try again.", 429);
    }
    const form = await request.formData();
    if (String(form.get("confirm") ?? "") !== "yes") {
      return relativeRedirect("/privacy?error=confirm");
    }
    const cookie = await readSessionCookie();
    const session = cookie ? await getSession(cookie) : null;
    if (session) await deleteSession(session.id);
    return clearSession(relativeRedirect("/?deleted=1"), request);
  } catch (error) {
    return fail(error);
  }
}
