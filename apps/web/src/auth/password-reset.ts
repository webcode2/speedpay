import { and, eq, gt, isNull } from "drizzle-orm";
import { passwordResetTokens } from "@solar/database/schema";
import { getDb } from "@/db";
import { generateOpaqueToken, hashToken } from "@/auth/tokens";
import { AppError } from "@/lib/app-error";

const RESET_TTL_MS = 60 * 60 * 1000;

export async function createPasswordResetToken(userId: string) {
  const db = getDb();
  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        isNull(passwordResetTokens.usedAt),
      ),
    );

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return rawToken;
}

export async function consumePasswordResetToken(rawToken: string) {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row) {
    throw new AppError(
      "INVALID_RESET_TOKEN",
      "Invalid or expired reset token.",
      400,
    );
  }

  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.id, row.id));

  return row;
}
