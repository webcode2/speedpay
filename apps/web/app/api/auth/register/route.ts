import { handleRouteError, apiSuccess, setSessionCookie } from "@/auth/http";
import { requestMeta } from "@/auth/request";
import { registerUser } from "@/services/auth-service";
import { registerSchema } from "@/validators/auth";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const result = await registerUser(body, requestMeta(request));
    await setSessionCookie(result.token);
    return apiSuccess(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
