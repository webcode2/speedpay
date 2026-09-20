import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken, requestMeta } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import {
  getAdminSettings,
  patchAdminSettings,
} from "@/services/admin-settings-service";

export async function GET(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    return apiSuccess(await getAdminSettings(admin.id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const body = (await request.json()) as { updates?: Record<string, string> };
    return apiSuccess(
      await patchAdminSettings(
        admin.id,
        body.updates ?? {},
        requestMeta(request),
      ),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
