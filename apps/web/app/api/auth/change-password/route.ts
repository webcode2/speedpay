import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { changePassword } from "@/services/auth-service";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const token = await getBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const resolved = await resolveSession(token);
    if (!resolved) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);

    const body = bodySchema.parse(await request.json());
    await changePassword(
      resolved.user.id,
      body.currentPassword,
      body.newPassword,
    );
    return apiSuccess({
      ok: true,
      message: "Password updated. Please sign in again.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
