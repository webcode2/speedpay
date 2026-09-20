import { apiSuccess, handleRouteError } from "@/auth/http";
import { forgotPassword } from "@/services/auth-service";
import { forgotPasswordSchema } from "@/validators/auth";

export async function POST(request: Request) {
  try {
    const body = forgotPasswordSchema.parse(await request.json());
    const result = await forgotPassword(body.email);
    return apiSuccess(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
