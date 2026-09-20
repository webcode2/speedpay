import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import {
  getRole,
  updateRolePermissions,
} from "@/services/admin-roles-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Ctx) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { id } = await context.params;
    return apiSuccess({ role: await getRole(admin.id, id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { id } = await context.params;
    const body = (await request.json()) as { permissionCodes?: string[] };
    return apiSuccess({
      role: await updateRolePermissions(
        admin.id,
        id,
        body.permissionCodes ?? [],
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
