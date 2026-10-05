import { apiSuccess, handleRouteError } from "@/auth/http";
import { listPublishedPaymentAccounts } from "@/services/platform-payment-account-service";

export async function GET() {
  try {
    const accounts = await listPublishedPaymentAccounts();
    return apiSuccess({
      items: accounts.map((a) => ({
        id: a.id,
        type: a.type,
        label: a.label,
        accountName: a.accountName,
        accountNumber: a.accountNumber,
        bankName: a.bankName,
        provider: a.provider,
        notes: a.notes,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
