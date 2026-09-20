import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { getReturnPreview } from "@/services/admin-returns-service";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { id } = await params;
    return apiSuccess({ investment: await getReturnPreview(admin.id, id) });
  } catch (error) {
    return handleRouteError(error);
  }
}
