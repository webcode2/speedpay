import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken, requestMeta } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import {
  deletePlan,
  getPlan,
  updatePlan,
} from "@/services/admin-plan-service";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  bannerImage: z.string().trim().nullable().optional(),
  price: z.number().int().positive(),
  termRoi: z.number().int().min(0).optional(),
  dailyRoi: z.number().int().min(0).optional(),
  durationDays: z.number().int().min(1).max(3650),
  dailyTaskLimit: z.number().int().min(1),
  taskReward: z.number().int().min(0),
  sortOrder: z.number().int().min(0).optional(),
});

export async function GET(request: Request, { params }: Params) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { id } = await params;
    return apiSuccess({ plan: await getPlan(admin.id, id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { id } = await params;
    const parsed = bodySchema.parse(await request.json());
    return apiSuccess({
      plan: await updatePlan(
        admin.id,
        id,
        {
          ...parsed,
          termRoi: parsed.termRoi ?? parsed.dailyRoi ?? 0,
        },
        requestMeta(request),
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { id } = await params;
    return apiSuccess(await deletePlan(admin.id, id, requestMeta(request)));
  } catch (error) {
    return handleRouteError(error);
  }
}
