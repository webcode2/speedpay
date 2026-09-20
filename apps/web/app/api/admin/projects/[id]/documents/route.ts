import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken, requestMeta } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { uploadProjectDocument } from "@/services/admin-project-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);

    const form = await request.formData();
    const kind = String(form.get("kind") ?? "");
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new AppError("VALIDATION_ERROR", "file is required.", 400);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const document = await uploadProjectDocument({
      adminId: admin.id,
      projectId: id,
      kind,
      fileName: file.name || "upload.bin",
      contentType: file.type || "application/octet-stream",
      bytes,
      meta: requestMeta(request),
    });
    return apiSuccess({
      document: {
        id: document.id,
        kind: document.kind,
        fileName: document.fileName,
        contentType: document.contentType,
        byteSize: document.byteSize,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
