import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { listTaskCompletions } from "@/services/admin-task-service";

export async function GET(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const url = new URL(request.url);
    return apiSuccess(
      await listTaskCompletions(admin.id, {
        userId: url.searchParams.get("userId"),
        date: url.searchParams.get("date"),
        limit: Number(url.searchParams.get("limit") ?? 50),
        before: url.searchParams.get("cursor"),
      }),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
