import { handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import {
  exportReportCsv,
  parseReportRange,
} from "@/services/admin-reports-service";

type Params = { params: Promise<{ kind: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const token = await getAdminBearerOrCookieToken(request);
    if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const admin = await getCurrentAdmin(token);
    const { kind } = await params;
    const url = new URL(request.url);
    const range = parseReportRange(
      url.searchParams.get("from"),
      url.searchParams.get("to"),
    );
    const { filename, csv } = await exportReportCsv(admin.id, kind, range);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
