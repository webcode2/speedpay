import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import {
  getProject,
  updateProject,
} from "@/services/admin-project-service";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().nullable().optional(),
  location: z.string().trim().nullable().optional(),
  capacity: z.string().trim().nullable().optional(),
  startDate: z.string().trim().nullable().optional(),
  completionDate: z.string().trim().nullable().optional(),
});

async function requireAdmin(request: Request) {
  const token = await getAdminBearerOrCookieToken(request);
  if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  return getCurrentAdmin(token);
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const admin = await requireAdmin(request);
    return apiSuccess(await getProject(admin.id, id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const admin = await requireAdmin(request);
    const body = patchSchema.parse(await request.json());
    const project = await updateProject(admin.id, id, body);
    return apiSuccess({ project });
  } catch (error) {
    return handleRouteError(error);
  }
}
