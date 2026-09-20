import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { listKycRequests } from "@/services/admin-kyc-service";

export async function GET(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const status = new URL(request.url).searchParams.get("status") ?? undefined;
    const items = await listKycRequests({ adminId: admin.id, status });
    return apiSuccess({ items });
  } catch (error) {
    return handleRouteError(error);
  }
}
