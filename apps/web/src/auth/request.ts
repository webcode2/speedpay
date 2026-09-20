import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, SESSION_COOKIE } from "@/lib/cookies";

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim() || null;
}

export async function getBearerOrCookieToken(
  request: Request,
): Promise<string | null> {
  const bearer = getBearerToken(request);
  if (bearer) return bearer;

  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value ?? null;
}

export async function getAdminBearerOrCookieToken(
  request: Request,
): Promise<string | null> {
  const bearer = getBearerToken(request);
  if (bearer) return bearer;

  const jar = await cookies();
  return jar.get(ADMIN_SESSION_COOKIE)?.value ?? null;
}

export function requestMeta(request: Request) {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: request.headers.get("user-agent"),
  };
}
