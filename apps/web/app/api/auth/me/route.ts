import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { getCurrentUser } from "@/services/auth-service";
import { AppError } from "@/lib/app-error";

export async function GET(request: Request) {
  try {
    const token = await getBearerOrCookieToken(request);
    if (!token) {
      throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    }
    const user = await getCurrentUser(token);
    return apiSuccess({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}
