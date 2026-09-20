import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken, requestMeta } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { getStaff, updateStaff } from "@/services/admin-staff-service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Ctx) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { id } = await context.params;
    return apiSuccess({ staff: await getStaff(admin.id, id) });
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
    const body = (await request.json()) as {
      name?: string;
      password?: string;
      status?: string;
      roleCodes?: string[];
    };
    return apiSuccess({
      staff: await updateStaff(admin.id, id, body, requestMeta(request)),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
