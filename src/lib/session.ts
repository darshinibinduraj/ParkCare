import { cookies } from "next/headers";
import { z } from "zod";

export const SESSION_COOKIE = "parkcare_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function sessionCookieOptions(secure = false) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure,
  };
}

export async function readSessionCookie(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(SESSION_COOKIE)?.value;
  if (!value || !z.string().uuid().safeParse(value).success) return null;
  return value;
}
