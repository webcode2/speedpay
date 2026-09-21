import { randomUUID } from "node:crypto";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { adminHasPermission } from "@/permissions/check";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { getStorage } from "@/storage";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const can =
      (await adminHasPermission(admin.id, "packages.create")) ||
      (await adminHasPermission(admin.id, "packages.update"));
    if (!can) throw new AppError("FORBIDDEN", "Missing required permission.", 403);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new AppError("VALIDATION_ERROR", "file is required.", 400);
    }
    const contentType = file.type || "application/octet-stream";
    if (!ALLOWED.has(contentType)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Only jpeg, png, or webp images are allowed.",
        400,
      );
    }
    const ext =
      contentType === "image/png"
        ? "png"
        : contentType === "image/webp"
          ? "webp"
          : "jpg";
    const storageKey = `packages/banners/${randomUUID()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await getStorage().put(storageKey, bytes, contentType);
    return apiSuccess({ storageKey });
  } catch (error) {
    return handleRouteError(error);
  }
}
