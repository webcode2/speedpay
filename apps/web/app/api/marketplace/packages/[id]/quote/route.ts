import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { quoteMarketplacePackage } from "@/services/marketplace-service";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  lotCount: z.number().int().positive(),
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
    await requireUser(request);
    const { id } = await params;
    const body = bodySchema.parse(await request.json());
    return apiSuccess(await quoteMarketplacePackage(id, body.lotCount));
  } catch (error) {
    return handleRouteError(error);
  }
}
