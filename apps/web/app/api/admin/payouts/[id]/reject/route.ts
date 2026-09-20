import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken, requestMeta } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { rejectPayout } from "@/services/admin-payout-service";
import { rejectPayoutSchema } from "@/validators/payout";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const body = rejectPayoutSchema.parse(await request.json());
    const account = await rejectPayout(admin.id, id, body.reason, requestMeta(request));
    return apiSuccess({ account });
  } catch (error) {
    return handleRouteError(error);
  }
}
