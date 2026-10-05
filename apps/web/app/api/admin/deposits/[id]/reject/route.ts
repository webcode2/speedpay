import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { rejectDeposit } from "@/services/admin-deposits-service";

const rejectSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required."),
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

    const body = rejectSchema.parse(await request.json());
    const deposit = await rejectDeposit(admin.id, params.id, body);
    return apiSuccess({ deposit });
  } catch (error) {
    return handleRouteError(error);
  }
}
