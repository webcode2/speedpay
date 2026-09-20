import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import {
  createWithdrawal,
  listWithdrawals,
} from "@/services/withdrawal-service";

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
    return apiSuccess({ items: await listWithdrawals(user.id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = (await request.json()) as {
      amount?: number;
      payoutAccountId?: string;
      pin?: string;
      idempotencyKey?: string;
    };
    if (
      typeof body.amount !== "number" ||
      !body.payoutAccountId ||
      !body.pin
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "amount, payoutAccountId, and pin are required.",
        400,
      );
    }
    const result = await createWithdrawal({
      userId: user.id,
      amount: body.amount,
      payoutAccountId: body.payoutAccountId,
      pin: body.pin,
      idempotencyKey:
        body.idempotencyKey ??
        request.headers.get("idempotency-key") ??
        undefined,
    });
    return apiSuccess(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
