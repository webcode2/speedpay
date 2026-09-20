import { eq } from "drizzle-orm";
import { withdrawalPins } from "@solar/database/schema";
import { hashPassword, verifyPassword } from "@/auth/password";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
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
