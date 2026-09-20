import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { uploadVerificationDocument } from "@/services/verification-service";

export async function POST(request: Request) {
  try {
    const token = await getBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const resolved = await resolveSession(token);
    if (!resolved) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);

    const form = await request.formData();
    const documentType = String(form.get("documentType") ?? "");
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new AppError("VALIDATION_ERROR", "file is required.", 400);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const doc = await uploadVerificationDocument({
      userId: resolved.user.id,
      documentType,
      fileName: file.name || "upload.bin",
      contentType: file.type || "application/octet-stream",
      bytes,
    });

    return apiSuccess({
      document: {
        id: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        contentType: doc.contentType,
        byteSize: doc.byteSize,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
