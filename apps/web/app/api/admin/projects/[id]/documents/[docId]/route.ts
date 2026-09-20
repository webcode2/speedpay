import { handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import { getProjectDocumentStream } from "@/services/admin-project-service";

type Params = { params: Promise<{ id: string; docId: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { id, docId } = await params;
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { doc, body } = await getProjectDocumentStream(admin.id, id, docId);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": doc.contentType,
        "Content-Disposition": `inline; filename="${doc.fileName}"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
