import { apiSuccess, handleRouteError } from "@/auth/http";
import { resetPassword } from "@/services/auth-service";
import { resetPasswordSchema } from "@/validators/auth";

export async function POST(request: Request) {
  try {
    const body = resetPasswordSchema.parse(await request.json());
    await resetPassword(body.token, body.password);
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
