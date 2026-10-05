import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken, requestMeta } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import {
  deleteTaskItem,
  getTaskItem,
  updateTaskItem,
} from "@/services/admin-task-service";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  title: z.string().trim().min(1),
  category: z.string().trim().min(1),
  description: z.string().trim().min(1),
  imageKey: z.string().trim().min(1),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: Request, { params }: Params) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { id } = await params;
    return apiSuccess({ item: await getTaskItem(admin.id, id) });
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
    const body = bodySchema.parse(await request.json());
    return apiSuccess({
      item: await updateTaskItem(admin.id, id, body, requestMeta(request)),
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
    return apiSuccess(await deleteTaskItem(admin.id, id, requestMeta(request)));
  } catch (error) {
    return handleRouteError(error);
  }
}
