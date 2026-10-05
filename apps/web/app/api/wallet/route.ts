import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { getWallet } from "@/services/wallet-service";
import { isWithdrawalEnabled } from "@/services/withdrawal-service";

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
    const [wallet, withdrawalsEnabled] = await Promise.all([
      getWallet(user.id),
      isWithdrawalEnabled(),
    ]);
    return apiSuccess({ wallet, withdrawalsEnabled });
  } catch (error) {
    return handleRouteError(error);
  }
}

