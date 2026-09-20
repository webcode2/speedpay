export const SESSION_COOKIE = "session_token";
export const ADMIN_SESSION_COOKIE = "admin_session_token";

export function sessionCookieMaxAgeSeconds(): number {
  const days = Number(process.env.SESSION_TTL_DAYS ?? 30);
  return Math.max(1, days) * 24 * 60 * 60;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: sessionCookieMaxAgeSeconds(),
  };
}
