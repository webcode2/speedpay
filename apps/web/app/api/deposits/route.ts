import { z } from "zod";
import { apiSuccess, handleRouteError } from "@/auth/http";
import { getBearerOrCookieToken } from "@/auth/request";
import { resolveSession } from "@/auth/session";
import { AppError } from "@/lib/app-error";
import { createDeposit, listDeposits } from "@/services/deposit-service";

const createSchema = z
  .object({
    amount: z.number().int().positive(),
    paymentAccountId: z.string().uuid().optional().nullable(),
    senderTransactionId: z.string().optional().nullable(),
    senderName: z.string().optional().nullable(),
    receiptUrl: z.string().optional().nullable(),
    receiptKey: z.string().optional().nullable(),
  })
  .refine(
    (data) =>
      Boolean(
        (data.senderTransactionId && data.senderTransactionId.trim().length > 0) ||
          (data.receiptUrl && data.receiptUrl.trim().length > 0),
      ),
    {
      message: "Please provide either a Transaction ID/Reference or upload a payment receipt.",
      path: ["senderTransactionId"],
    },
  );

async function requireUser(request: Request) {
  const token = await getBearerOrCookieToken(request);
  if (!token) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  const resolved = await resolveSession(token);
  if (!resolved) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  return resolved.user;
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return apiSuccess({ items: await listDeposits(user.id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = createSchema.parse(await request.json());
    return apiSuccess(
      await createDeposit({
        userId: user.id,
        amount: body.amount,
        paymentAccountId: body.paymentAccountId,
        senderTransactionId: body.senderTransactionId,
        senderName: body.senderName,
        receiptUrl: body.receiptUrl,
        receiptKey: body.receiptKey,
      }),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

