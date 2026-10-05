import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { changePassword } from "@/services/auth-service";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(7, "New password must be at least 7 characters"),
});

async function requireUser(request: Request) {
  const token = await getBearerOrCookieToken(request);
  if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  const resolved = await resolveSession(token);
  if (!resolved) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  return resolved.user;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = changePasswordSchema.parse(await request.json());
    await changePassword(user.id, body.currentPassword, body.newPassword);
    return apiSuccess({ message: "Password updated successfully" });
  } catch (error) {
    return handleRouteError(error);
  }
}
