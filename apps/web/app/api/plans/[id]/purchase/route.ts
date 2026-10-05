import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { purchasePlan } from "@/services/purchase-service";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  slotCount: z.number().int().positive().optional(),
  idempotencyKey: z.string().trim().min(1).max(128).optional(),
});

async function requireUser(request: Request) {
  const token = await getBearerOrCookieToken(request);
  if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  const resolved = await resolveSession(token);
  if (!resolved) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  return resolved.user;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    const raw = await request.json().catch(() => ({}));
    const body = bodySchema.parse(raw ?? {});
    const headerKey = request.headers.get("idempotency-key")?.trim();
    const result = await purchasePlan({
      userId: user.id,
      planId: id,
      idempotencyKey: body.idempotencyKey ?? headerKey ?? null,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
