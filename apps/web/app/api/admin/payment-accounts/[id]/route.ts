import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getAdminBearerOrCookieToken, requestMeta } from "@/auth/request";
import { AppError } from "@/lib/app-error";
import { getCurrentAdmin } from "@/services/admin-auth-service";
import {
  deletePaymentAccount,
  getPaymentAccount,
  updatePaymentAccount,
} from "@/services/platform-payment-account-service";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  type: z.enum(["BANK", "MOBILE_MONEY", "OTHER"]),
  label: z.string().trim().min(1).max(200),
  accountName: z.string().trim().min(1).max(200),
  accountNumber: z.string().trim().min(1).max(100),
  bankName: z.string().trim().nullable().optional(),
  provider: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

async function requireAdmin(request: Request) {
  const token = await getAdminBearerOrCookieToken(request);
  if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  return getCurrentAdmin(token);
}

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const admin = await requireAdmin(request);
    return apiSuccess({ account: await getPaymentAccount(admin.id, id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const admin = await requireAdmin(request);
    const body = bodySchema.parse(await request.json());
    return apiSuccess({
      account: await updatePaymentAccount(
        admin.id,
        id,
        body,
        requestMeta(request),
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const admin = await requireAdmin(request);
    await deletePaymentAccount(admin.id, id, requestMeta(request));
    return apiSuccess({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
