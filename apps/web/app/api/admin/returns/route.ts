import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { listEligibleReturns } from "@/services/admin-returns-service";

export async function GET(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const url = new URL(request.url);
    const all = url.searchParams.get("all") === "1";
    const items = await listEligibleReturns({
      adminId: admin.id,
      eligibleOnly: !all,
    });
    return apiSuccess({ items });
  } catch (error) {
    return handleRouteError(error);
  }
}
