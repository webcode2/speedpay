import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken, requestMeta } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { createStaff, listStaff } from "@/services/admin-staff-service";

export async function GET(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const url = new URL(request.url);
    return apiSuccess(
      await listStaff({
        adminId: admin.id,
        q: url.searchParams.get("q") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        limit: Number(url.searchParams.get("limit") ?? 50),
        offset: Number(url.searchParams.get("offset") ?? 0),
      }),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const body = (await request.json()) as {
      email?: string;
      name?: string;
      password?: string;
      roleCodes?: string[];
      status?: string;
    };
    return apiSuccess(
      {
        staff: await createStaff(admin.id, {
          email: body.email ?? "",
          name: body.name ?? "",
          password: body.password ?? "",
          roleCodes: body.roleCodes ?? [],
          status: body.status,
        }, requestMeta(request)),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
