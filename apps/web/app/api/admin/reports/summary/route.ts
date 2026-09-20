import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import {
  getReportsSummary,
  parseReportRange,
} from "@/services/admin-reports-service";

export async function GET(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const url = new URL(request.url);
    const range = parseReportRange(
      url.searchParams.get("from"),
      url.searchParams.get("to"),
    );
    return apiSuccess({
      summary: await getReportsSummary(admin.id, range),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
