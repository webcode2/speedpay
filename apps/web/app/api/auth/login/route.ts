import { handleRouteError, apiSuccess, setSessionCookie } from "@/auth/http";
import { requestMeta } from "@/auth/request";
import { loginUser } from "@/services/auth-service";
import { loginSchema } from "@/validators/auth";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const result = await loginUser(body, requestMeta(request));
    await setSessionCookie(result.token);
    return apiSuccess(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
