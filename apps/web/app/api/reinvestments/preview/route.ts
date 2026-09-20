import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { getReinvestPreview } from "@/services/reinvest-service";

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
    const parentId = new URL(request.url).searchParams.get(
      "parentInvestmentId",
    );
    if (!parentId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "parentInvestmentId query is required.",
        400,
      );
    }
    return apiSuccess({
      preview: await getReinvestPreview(user.id, parentId),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
