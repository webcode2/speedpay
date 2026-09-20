import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { listAuditLogs } from "@/services/admin-audit-service";

export async function GET(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const url = new URL(request.url);
    return apiSuccess(
      await listAuditLogs({
        adminId: admin.id,
        action: url.searchParams.get("action") ?? undefined,
        entityType: url.searchParams.get("entityType") ?? undefined,
        actorId: url.searchParams.get("actorId") ?? undefined,
        from: url.searchParams.get("from") ?? undefined,
        to: url.searchParams.get("to") ?? undefined,
        limit: Number(url.searchParams.get("limit") ?? 50),
        offset: Number(url.searchParams.get("offset") ?? 0),
      }),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
