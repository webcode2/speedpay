import {
  apiSuccess,
  clearSessionCookie,
  handleRouteError,
} from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { logoutUser } from "@/services/auth-service";
import { AppError } from "@/lib/app-error";

export async function POST(request: Request) {
  try {
    const token = await getBearerOrCookieToken(request);
    if (!token) {
      throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    }
    await logoutUser(token);
    await clearSessionCookie();
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
