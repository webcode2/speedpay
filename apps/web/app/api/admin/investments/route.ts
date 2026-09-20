import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { listAdminInvestments } from "@/services/admin-investments-service";

export async function GET(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const url = new URL(request.url);
    return apiSuccess(
      await listAdminInvestments({
        adminId: admin.id,
        status: url.searchParams.get("status") ?? undefined,
        limit: Number(url.searchParams.get("limit") ?? 50),
        offset: Number(url.searchParams.get("offset") ?? 0),
      }),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
