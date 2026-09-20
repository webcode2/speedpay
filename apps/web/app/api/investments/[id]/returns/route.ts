import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { getInvestmentReturns } from "@/services/portfolio-service";

type Params = { params: Promise<{ id: string }> };

async function requireUser(request: Request) {
  const token = await getBearerOrCookieToken(request);
  if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  const resolved = await resolveSession(token);
  if (!resolved) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  return resolved.user;
}

export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireUser(request);
    const { id } = await params;
    return apiSuccess({ returns: await getInvestmentReturns(user.id, id) });
  } catch (error) {
    return handleRouteError(error);
  }
}
