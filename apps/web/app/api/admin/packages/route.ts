import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import {
  createPackage,
  listPackages,
} from "@/services/admin-package-service";

const bodySchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().nullable().optional(),
  lotPrice: z.string().trim().min(1),
  totalLots: z.number().int().positive(),
  minimumLots: z.number().int().positive().optional(),
  maximumLots: z.number().int().positive().nullable().optional(),
  returnType: z.enum(["FIXED_RETURN", "FIXED_PROFIT"]),
  returnRate: z.string().trim().min(1),
  durationDays: z.number().int().positive(),
  availableFrom: z.string().nullable().optional(),
  availableUntil: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
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
    return apiSuccess({
      items: await listPackages(admin.id, status || undefined),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    const body = bodySchema.parse(await request.json());
    return apiSuccess({ package: await createPackage(admin.id, body) });
  } catch (error) {
    return handleRouteError(error);
  }
}
