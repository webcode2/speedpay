import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken, requestMeta } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { setDefaultPayoutAccount } from "@/services/payout-account-service";

type Params = { params: Promise<{ id: string }> };

async function requireUser(request: Request) {
  const token = await getBearerOrCookieToken(request);
  if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  const resolved = await resolveSession(token);
  if (!resolved) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  return resolved.user;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireUser(request);
    const account = await setDefaultPayoutAccount(
      user.id,
      id,
      requestMeta(request),
    );
    return apiSuccess({ account });
  } catch (error) {
    return handleRouteError(error);
  }
}
