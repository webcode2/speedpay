import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken, requestMeta } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { rejectKyc } from "@/services/admin-kyc-service";

type Params = { params: Promise<{ id: string }> };
const bodySchema = z.object({ reason: z.string().min(1) });

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const body = bodySchema.parse(await request.json());
    const updated = await rejectKyc(admin.id, id, body.reason, requestMeta(request));
    return apiSuccess({ request: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
