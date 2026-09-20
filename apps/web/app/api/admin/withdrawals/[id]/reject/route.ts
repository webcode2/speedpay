import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { rejectWithdrawal } from "@/services/admin-withdrawal-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { id } = await params;
    const body = (await request.json()) as { reason?: string };
    if (!body.reason?.trim()) {
      throw new AppError("VALIDATION_ERROR", "reason is required.", 400);
    }
    return apiSuccess({
      withdrawal: await rejectWithdrawal(admin.id, id, body.reason),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
