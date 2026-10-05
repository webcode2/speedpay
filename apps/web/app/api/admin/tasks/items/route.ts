import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken, requestMeta } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import {
  createTaskItem,
  listTaskItems,
} from "@/services/admin-task-service";

const bodySchema = z.object({
  title: z.string().trim().min(1),
  category: z.string().trim().min(1),
  description: z.string().trim().min(1),
  imageKey: z.string().trim().min(1),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const status = new URL(request.url).searchParams.get("status") ?? undefined;
    return apiSuccess({ items: await listTaskItems(admin.id, status) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const body = bodySchema.parse(await request.json());
    return apiSuccess(
      { item: await createTaskItem(admin.id, body, requestMeta(request)) },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
