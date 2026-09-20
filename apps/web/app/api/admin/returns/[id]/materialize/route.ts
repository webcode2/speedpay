import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { materializeReturn } from "@/services/admin-returns-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      idempotencyKey?: string;
    };
    const result = await materializeReturn({
      adminId: admin.id,
      investmentId: id,
      idempotencyKey: body.idempotencyKey,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
