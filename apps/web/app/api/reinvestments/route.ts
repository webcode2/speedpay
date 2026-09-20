import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import {
  createReinvestment,
  listReinvestments,
} from "@/services/reinvest-service";

async function requireUser(request: Request) {
  const token = await getBearerOrCookieToken(request);
  if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  const resolved = await resolveSession(token);
  if (!resolved) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  return resolved.user;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return apiSuccess({ items: await listReinvestments(user.id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json()) as {
      parentInvestmentId?: string;
      packageId?: string;
      lotCount?: number;
      idempotencyKey?: string;
    };
    if (
      !body.parentInvestmentId ||
      !body.packageId ||
      typeof body.lotCount !== "number"
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "parentInvestmentId, packageId, and lotCount are required.",
        400,
      );
    }
    const result = await createReinvestment({
      userId: user.id,
      parentInvestmentId: body.parentInvestmentId,
      packageId: body.packageId,
      lotCount: body.lotCount,
      idempotencyKey:
        body.idempotencyKey ??
        request.headers.get("idempotency-key") ??
        null,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
