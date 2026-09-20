import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { getAdminDashboard } from "@/services/admin-dashboard-service";

export async function GET(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    return apiSuccess({ dashboard: await getAdminDashboard(admin.id) });
  } catch (error) {
    return handleRouteError(error);
  }
}
