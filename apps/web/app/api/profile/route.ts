import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { getProfile, updateProfile } from "@/services/profile-service";

const patchSchema = z.object({
  firstName: z.string().trim().nullable().optional(),
  middleName: z.string().trim().nullable().optional(),
  lastName: z.string().trim().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  state: z.string().trim().nullable().optional(),
  country: z.string().trim().nullable().optional(),
  profileImage: z.string().trim().nullable().optional(),
});

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
    return apiSuccess(await getProfile(user.id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser(request);
    const body = patchSchema.parse(await request.json());
    return apiSuccess(await updateProfile(user.id, body));
  } catch (error) {
    return handleRouteError(error);
  }
}
