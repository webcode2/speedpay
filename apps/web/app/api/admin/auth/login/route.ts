import { z } from "zod";
import {
  handleRouteError,
  apiSuccess,
  setAdminSessionCookie,
} from "@/auth/http";
import { requestMeta } from "@/auth/request";
import { loginAdmin } from "@/services/admin-auth-service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const result = await loginAdmin(
      {
        email: body.email.trim().toLowerCase(),
        password: body.password,
      },
      requestMeta(request),
    );
    await setAdminSessionCookie(result.token);
    return apiSuccess(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
