import {
  apiSuccess,
  clearAdminSessionCookie,
  handleRouteError,
} from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { logoutAdmin } from "@/services/admin-auth-service";

export async function POST(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    await logoutAdmin(token);
    await clearAdminSessionCookie();
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
