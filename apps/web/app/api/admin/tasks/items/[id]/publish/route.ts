import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken, requestMeta } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { setTaskItemStatus } from "@/services/admin-task-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { id } = await params;
    return apiSuccess({
      item: await setTaskItemStatus(
        admin.id,
        id,
        "PUBLISHED",
        requestMeta(request),
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
