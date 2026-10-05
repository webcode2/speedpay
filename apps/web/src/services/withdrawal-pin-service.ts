import { and, eq, gt, isNull } from "drizzle-orm";
import { passwordResetTokens, users, withdrawalPins } from "@solar/database/schema";
import { hashPassword, verifyPassword } from "@/auth/password";
import { hashToken } from "@/auth/tokens";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import { safeNotify } from "@/services/notification-service";
import { getSettingNumber } from "@/settings/settings";

export async function assertValidPinFormat(pin: string) {
  const minLen = await getSettingNumber("withdrawal.pin_min_length", 4);
  const maxLen = await getSettingNumber("withdrawal.pin_max_length", 6);
  const re = new RegExp(`^\\d{${minLen},${maxLen}}$`);
  if (!re.test(pin)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `PIN must be ${minLen}–${maxLen} digits.`,
      400,
    );
  }
}

export function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length < 2 || !parts[0] || !parts[1]) return email;
  const local = parts[0];
  const domain = parts[1];
  const masked =
    local.length <= 2
      ? local[0] + "***"
      : local.slice(0, 2) + "***" + local.slice(-1);
  return `${masked}@${domain}`;
}

export async function getPinStatus(userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ userId: withdrawalPins.userId })
    .from(withdrawalPins)
    .where(eq(withdrawalPins.userId, userId))
    .limit(1);
  return { hasPin: Boolean(row) };
}

export async function setWithdrawalPin(userId: string, pin: string) {
  await assertValidPinFormat(pin);
  const db = getDb();
  const [existing] = await db
    .select()
    .from(withdrawalPins)
    .where(eq(withdrawalPins.userId, userId))
    .limit(1);
  if (existing) {
    throw new AppError(
      "INVALID_STATE",
      "Withdrawal PIN already set. Use change PIN.",
      400,
    );
  }
  const pinHash = await hashPassword(pin);
  await db.insert(withdrawalPins).values({ userId, pinHash });
  return { hasPin: true };
}

export async function changeWithdrawalPin(
  userId: string,
  currentPin: string,
  newPin: string,
) {
  await assertValidPinFormat(currentPin);
  await assertValidPinFormat(newPin);
  const db = getDb();
  const [row] = await db
    .select()
    .from(withdrawalPins)
    .where(eq(withdrawalPins.userId, userId))
    .limit(1);
  if (!row) {
    throw new AppError("INVALID_STATE", "Withdrawal PIN not set.", 400);
  }
  const ok = await verifyPassword(row.pinHash, currentPin);
  if (!ok) {
    throw new AppError("FORBIDDEN", "Current PIN is incorrect.", 403);
  }
  const pinHash = await hashPassword(newPin);
  await db
    .update(withdrawalPins)
    .set({ pinHash, updatedAt: new Date() })
    .where(eq(withdrawalPins.userId, userId));
  return { hasPin: true };
}

export async function verifyWithdrawalPin(userId: string, pin: string) {
  await assertValidPinFormat(pin);
  const db = getDb();
  const [row] = await db
    .select()
    .from(withdrawalPins)
    .where(eq(withdrawalPins.userId, userId))
    .limit(1);
  if (!row) {
    throw new AppError("INVALID_STATE", "Withdrawal PIN not set.", 400);
  }
  const ok = await verifyPassword(row.pinHash, pin);
  if (!ok) {
    throw new AppError("FORBIDDEN", "PIN is incorrect.", 403);
  }
  return { verified: true };
}

export async function requestPinResetOtp(userId: string) {
  const db = getDb();
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new AppError("NOT_FOUND", "User account not found.", 404);
  }

  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const tokenHash = hashToken(`PIN_RESET:${userId}:${otp}`);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

  // Invalidate previous reset tokens for this user
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

  await safeNotify({
    userId,
    code: "PIN_RESET_OTP",
    vars: { otp },
  });

  return {
    message: `A 6-digit verification code has been sent to ${maskEmail(user.email)}.`,
    emailMasked: maskEmail(user.email),
    otp: process.env.NODE_ENV === "development" ? otp : undefined,
  };
}

export async function resetWithdrawalPinWithOtp(input: {
  userId: string;
  password: string;
  otp: string;
  newPin: string;
}) {
  await assertValidPinFormat(input.newPin);
  const db = getDb();

  // 1. Verify user's account password
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (!user) {
    throw new AppError("NOT_FOUND", "User account not found.", 404);
  }

  const passwordOk = await verifyPassword(user.passwordHash, input.password);
  if (!passwordOk) {
    throw new AppError("FORBIDDEN", "Invalid account password.", 403);
  }

  // 2. Verify Email OTP
  const tokenHash = hashToken(`PIN_RESET:${input.userId}:${input.otp.trim()}`);
  const now = new Date();

  const [tokenRow] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        eq(passwordResetTokens.userId, input.userId),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, now),
      ),
    )
    .limit(1);

  if (!tokenRow) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Invalid or expired verification code.",
      400,
    );
  }

  // Mark token as used
  await db
    .update(passwordResetTokens)
    .set({ usedAt: now })
    .where(eq(passwordResetTokens.id, tokenRow.id));

  // 3. Hash new PIN and upsert withdrawalPins row
  const pinHash = await hashPassword(input.newPin);

  const [existingPin] = await db
    .select()
    .from(withdrawalPins)
    .where(eq(withdrawalPins.userId, input.userId))
    .limit(1);

  if (existingPin) {
    await db
      .update(withdrawalPins)
      .set({ pinHash, updatedAt: now })
      .where(eq(withdrawalPins.userId, input.userId));
  } else {
    await db.insert(withdrawalPins).values({
      userId: input.userId,
      pinHash,
    });
  }

  return { hasPin: true, message: "Withdrawal PIN has been reset successfully." };
}
