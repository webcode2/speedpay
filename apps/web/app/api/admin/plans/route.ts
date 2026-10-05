import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken, requestMeta } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { createPlan, listPlans } from "@/services/admin-plan-service";

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

export async function GET(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const status = new URL(request.url).searchParams.get("status") ?? undefined;
    return apiSuccess({ items: await listPlans(admin.id, status) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const parsed = bodySchema.parse(await request.json());
    const plan = await createPlan(
      admin.id,
      {
        ...parsed,
        termRoi: parsed.termRoi ?? parsed.dailyRoi ?? 0,
      },
      requestMeta(request),
    );
    return apiSuccess({ plan }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
