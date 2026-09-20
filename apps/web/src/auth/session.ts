import { and, eq, gt, isNull } from "drizzle-orm";
import { userSessions, users } from "@solar/database/schema";
import { getDb } from "@/db";
import { generateOpaqueToken, hashToken } from "@/auth/tokens";
import { getSettingNumber } from "@/settings/settings";

async function sessionTtlDays(): Promise<number> {
  const fromDb = await getSettingNumber("security.session_ttl_days", 0);
  if (fromDb > 0) return Math.max(1, fromDb);
  return Math.max(1, Number(process.env.SESSION_TTL_DAYS ?? 30));
}

export async function createUserSession(input: {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const db = getDb();
  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);
  const days = await sessionTtlDays();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const [session] = await db
    .insert(userSessions)
    .values({
      userId: input.userId,
      tokenHash,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      expiresAt,
    })
    .returning();

  return { rawToken, session: session! };
}

export async function revokeSessionByRawToken(rawToken: string) {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(userSessions.tokenHash, tokenHash), isNull(userSessions.revokedAt)),
    );
}

export async function revokeAllUserSessions(userId: string) {
  const db = getDb();
  await db
    .update(userSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)),
    );
}

export async function resolveSession(rawToken: string) {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const rows = await db
    .select({
      session: userSessions,
      user: users,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(
      and(
        eq(userSessions.tokenHash, tokenHash),
        isNull(userSessions.revokedAt),
        gt(userSessions.expiresAt, now),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return row;
}
