import { z } from "zod";

export const payoutAccountBodySchema = z.object({
  bankName: z.string().trim().min(1).max(120),
  accountNumber: z.string().trim().min(4).max(34),
  accountName: z.string().trim().min(1).max(120),
});

export const rejectPayoutSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});
