import {
  apiSuccess,
  clearSessionCookie,
  handleRouteError,
} from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { logoutAllSessions } from "@/services/auth-service";

export async function POST(request: Request) {
  try {
    const token = await getBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const resolved = await resolveSession(token);
    if (!resolved) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);

    await logoutAllSessions(resolved.user.id);
    await clearSessionCookie();
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
