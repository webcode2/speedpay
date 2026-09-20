import { eq } from "drizzle-orm";
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
import { safeNotify } from "@/services/notification-service";

type Meta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function registerUser(
  input: { email: string; password: string; phone?: string | null },
  meta: Meta = {},
) {
  const db = getDb();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing) {
    throw new AppError("EMAIL_TAKEN", "An account with this email already exists.", 409);
  }

  const passwordHash = await hashPassword(input.password);

  const result = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: input.email,
        phone: input.phone || null,
        passwordHash,
        status: "EMAIL_UNVERIFIED",
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
  input: { email: string; password: string },
  meta: Meta = {},
) {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
  }

  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) {
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
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
  const row = await consumePasswordResetToken(rawToken);
  const passwordHash = await hashPassword(password);
  const db = getDb();

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, row.userId));

  await revokeAllUserSessions(row.userId);
}
