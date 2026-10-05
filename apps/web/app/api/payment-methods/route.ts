import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { listPublishedPaymentAccounts } from "@/services/platform-payment-account-service";

async function requireUser(request: Request) {
  const token = await getBearerOrCookieToken(request);
  if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  const resolved = await resolveSession(token);
  if (!resolved) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  return resolved.user;
}

export async function GET(request: Request) {
  try {
    await requireUser(request);
    const rows = await listPublishedPaymentAccounts();
    return apiSuccess({
      items: rows.map((row) => ({
        id: row.id,
        label: row.label,
        type: row.type,
        accountName: row.accountName,
        accountNumber: row.accountNumber,
        bankName: row.bankName,
        provider: row.provider,
        notes: row.notes,
        subtitle:
          row.bankName ||
          row.provider ||
          (row.type === "BANK" ? "Bank transfer" : "Online Payment"),
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
