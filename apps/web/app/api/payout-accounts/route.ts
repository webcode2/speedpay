import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import {
  createPayoutAccount,
  listPayoutAccounts,
} from "@/services/payout-account-service";
import { payoutAccountBodySchema } from "@/validators/payout";

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
    const items = await listPayoutAccounts(user.id);
    return apiSuccess({ items });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = payoutAccountBodySchema.parse(await request.json());
    const account = await createPayoutAccount(user.id, body);
    return apiSuccess({ account });
  } catch (error) {
    return handleRouteError(error);
  }
}
