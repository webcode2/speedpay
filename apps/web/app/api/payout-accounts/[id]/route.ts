import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken, requestMeta } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import {
  deletePayoutAccount,
  updatePayoutAccount,
} from "@/services/payout-account-service";
import { payoutAccountBodySchema } from "@/validators/payout";

type Params = { params: Promise<{ id: string }> };

async function requireUser(request: Request) {
  const token = await getBearerOrCookieToken(request);
  if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  const resolved = await resolveSession(token);
  if (!resolved) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  return resolved.user;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    const body = payoutAccountBodySchema.parse(await request.json());
    const account = await updatePayoutAccount(user.id, id, body);
    return apiSuccess({ account });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    const result = await deletePayoutAccount(user.id, id, requestMeta(request));
    return apiSuccess(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
