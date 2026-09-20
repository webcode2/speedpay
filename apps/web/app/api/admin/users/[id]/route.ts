import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken, requestMeta } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import {
  getAdminUser,
  setAdminUserStatus,
} from "@/services/admin-users-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { id } = await params;
    return apiSuccess({ user: await getAdminUser(admin.id, id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { id } = await params;
    const body = (await request.json()) as { action?: string };
    if (body.action !== "disable" && body.action !== "enable") {
      throw new AppError(
        "VALIDATION_ERROR",
        "action must be disable or enable.",
        400,
      );
    }
    return apiSuccess({
      user: await setAdminUserStatus(
        admin.id,
        id,
        body.action,
        requestMeta(request),
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
