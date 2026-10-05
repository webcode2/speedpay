import { randomUUID } from "node:crypto";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { getStorage } from "@/storage";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "application/pdf",
]);

export async function POST(request: Request) {
  try {
    const token = await getBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const resolved = await resolveSession(token);
    if (!resolved) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new AppError("VALIDATION_ERROR", "file is required.", 400);
    }

    const contentType = file.type || "application/octet-stream";
    if (!ALLOWED.has(contentType)) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Only image files (JPG, PNG, WEBP) or PDF receipts are allowed.",
        400,
      );
    }

    const ext =
      contentType === "application/pdf"
        ? "pdf"
        : contentType === "image/png"
        ? "png"
        : contentType === "image/webp"
        ? "webp"
        : "jpg";

    const storageKey = `receipts/${resolved.user.id}/${randomUUID()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await getStorage().put(storageKey, bytes, contentType);

    return apiSuccess({
      storageKey,
      receiptUrl: `/api/media/${storageKey}`,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
