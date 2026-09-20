import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import {
  createProject,
  listProjects,
} from "@/services/admin-project-service";

const createSchema = z.object({
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

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const status = new URL(request.url).searchParams.get("status") ?? undefined;
    const items = await listProjects(admin.id, status || undefined);
    return apiSuccess({ items });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = createSchema.parse(await request.json());
    const project = await createProject(admin.id, body);
    return apiSuccess({ project });
  } catch (error) {
    return handleRouteError(error);
  }
}
