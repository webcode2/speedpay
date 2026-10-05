import { randomUUID } from "node:crypto";
import { eq, inArray, or } from "drizzle-orm";
import { userProfiles, users } from "@solar/database/schema";
import { hashPassword, verifyPassword } from "@/auth/password";
import {
  createPasswordResetToken,
  consumePasswordResetToken,
} from "@/auth/password-reset";
import { toPublicUser } from "@/auth/public-user";
import {
  createUserSession,
  resolveSession,
  revokeAllUserSessions,
  revokeSessionByRawToken,
} from "@/auth/session";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";
import {
  normalizeInviteCode,
  referralCodeFromId,
} from "@/lib/referral";
import { safeNotify } from "@/services/notification-service";
import { getSettingNumber } from "@/settings/settings";

type Meta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

async function assertPasswordPolicy(password: string) {
  const minSetting = await getSettingNumber("security.password_min_length", 7);
  const min = Math.min(minSetting, 7);
  if (password.length < min) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Password must be at least ${min} characters.`,
      400,
    );
  }
}

export async function registerUser(
  input: {
    email: string;
    password: string;
    phone?: string | null;
    inviteCode?: string | null;
  },
  meta: Meta = {},
) {
  await assertPasswordPolicy(input.password);
  const db = getDb();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing) {
    throw new AppError("EMAIL_TAKEN", "An account with this email already exists.", 409);
  }

  const invite = normalizeInviteCode(input.inviteCode);
  let referredByUserId: string | null = null;
  if (invite) {
    const [referrer] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.referralCode, invite))
      .limit(1);
    if (!referrer) {
      throw new AppError("VALIDATION_ERROR", "Invite code is not valid.", 400);
    }
    referredByUserId = referrer.id;
  }

  const passwordHash = await hashPassword(input.password);
  const id = randomUUID();

  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        id,
        email: input.email,
        phone: input.phone || null,
        passwordHash,
        status: "EMAIL_UNVERIFIED",
        referralCode: referralCodeFromId(id),
        referredByUserId,
      })
      .returning();

    await tx.insert(userProfiles).values({
      userId: user!.id,
    });

    return user!;
  });

  const { rawToken } = await createUserSession({
    userId: result.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  await safeNotify({ userId: result.id, code: "ACCOUNT_CREATED" });

  return { token: rawToken, user: toPublicUser(result) };
}

export async function loginUser(
  input: {
    email?: string;
    phone?: string;
    identifier?: string;
    password: string;
  },
  meta: Meta = {},
) {
  const db = getDb();
  const ident = (input.identifier || input.phone || input.email || "").trim();
  if (!ident) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Phone number or email is required.",
      400,
    );
  }

  const digits = ident.replace(/\D/g, "");
  const candidates: string[] = [ident, ident.toLowerCase()];
  if (digits.length >= 7) {
    candidates.push(digits);
    if (digits.startsWith("234")) {
      candidates.push("+" + digits);
      candidates.push("0" + digits.slice(3));
    } else if (digits.startsWith("0")) {
      candidates.push("+234" + digits.slice(1));
    } else {
      candidates.push("+234" + digits);
      candidates.push("0" + digits);
    }
  }

  const [user] = await db
    .select()
    .from(users)
    .where(
      or(
        inArray(users.email, candidates),
        inArray(users.phone, candidates),
      ),
    )
    .limit(1);

  if (!user) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Invalid credentials. Please verify your phone or password.",
      401,
    );
  }

  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Invalid credentials. Please verify your phone or password.",
      401,
    );
  }

  if (user.status === "SUSPENDED" || user.status === "CLOSED") {
    throw new AppError("ACCOUNT_DISABLED", "This account is disabled.", 403);
  }

  const { rawToken } = await createUserSession({
    userId: user.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return { token: rawToken, user: toPublicUser(user) };
}

export async function logoutUser(rawToken: string) {
  await revokeSessionByRawToken(rawToken);
}

export async function getCurrentUser(rawToken: string) {
  const resolved = await resolveSession(rawToken);
  if (!resolved) {
    throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
  }
  return toPublicUser(resolved.user);
}

export async function forgotPassword(email: string) {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const message =
    "If an account exists for that email, password reset instructions were issued.";

  if (!user) {
    return { message };
  }

  const resetToken = await createPasswordResetToken(user.id);

  if (process.env.NODE_ENV === "development") {
    return { message, resetToken };
  }

  return { message };
}

export async function resetPassword(rawToken: string, password: string) {
  await assertPasswordPolicy(password);
  const row = await consumePasswordResetToken(rawToken);
  const passwordHash = await hashPassword(password);
  const db = getDb();

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, row.userId));

  await revokeAllUserSessions(row.userId);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  await assertPasswordPolicy(newPassword);
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError("NOT_FOUND", "User not found.", 404);

  const ok = await verifyPassword(user.passwordHash, currentPassword);
  if (!ok) {
    throw new AppError("INVALID_CREDENTIALS", "Current password is incorrect.", 401);
  }

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await revokeAllUserSessions(userId);
}

export async function logoutAllSessions(userId: string) {
  await revokeAllUserSessions(userId);
}
