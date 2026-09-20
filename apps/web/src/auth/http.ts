import { cookies } from "next/headers";
import { ZodError } from "zod";
import type { ApiErrorCode } from "@solar/types";
import { apiError, apiSuccess } from "@/lib/api-response";
import { AppError } from "@/lib/app-error";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/cookies";
import { logger } from "@/lib/logger";

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError(
      "VALIDATION_ERROR",
      error.issues[0]?.message ?? "Invalid request.",
      400,
    );
  }
  if (error instanceof AppError) {
    return apiError(error.code, error.message, error.status);
  }
  logger.error("auth.route_error", {
    reason: error instanceof Error ? error.message : "unknown",
  });
  return apiError("INTERNAL_ERROR", "Something went wrong.", 500);
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}

export { apiSuccess, apiError };
export type { ApiErrorCode };
