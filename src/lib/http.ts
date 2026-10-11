import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function fail(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("Some of that information did not look valid. Please check it and try again.", 400);
  }
  console.error(error instanceof Error ? error.name : "server_error");
  return jsonError("Something went wrong on the server. Please try again.", 500);
}

export function requestIsSecure(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) return forwarded.split(",")[0]?.trim() === "https";
  return new URL(request.url).protocol === "https:";
}

/** Keep the browser on the current host. An absolute redirect was sending the public site to localhost. */
export function relativeRedirect(path: string, status = 303) {
  return new NextResponse(null, {
    status,
    headers: { Location: path },
  });
}

export function withSession(response: NextResponse, sessionId: string, request: Request) {
  response.cookies.set(SESSION_COOKIE, sessionId, sessionCookieOptions(requestIsSecure(request)));
  return response;
}

export function clearSession(response: NextResponse, request: Request) {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(requestIsSecure(request)), maxAge: 0 });
  return response;
}
