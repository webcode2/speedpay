import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { approveDeposit } from "@/services/admin-deposits-service";

const approveSchema = z.object({
  adminNotes: z.string().optional(),
});

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Empty body allowed
    }
    const parsed = approveSchema.parse(body);

    const deposit = await approveDeposit(admin.id, params.id, parsed);
    return apiSuccess({ deposit });
  } catch (error) {
    return handleRouteError(error);
  }
}
