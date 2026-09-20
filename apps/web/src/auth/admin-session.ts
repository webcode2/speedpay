import { and, eq, gt, isNull } from "drizzle-orm";
import { adminSessions, admins } from "@solar/database/schema";
import { generateOpaqueToken, hashToken } from "@/auth/tokens";
import { getDb } from "@/db";

function sessionTtlDays(): number {
  return Math.max(1, Number(process.env.SESSION_TTL_DAYS ?? 30));
}

export async function createAdminSession(input: {
  adminId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const db = getDb();
  const rawToken = generateOpaqueToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + sessionTtlDays() * 24 * 60 * 60 * 1000,
  );

  const [session] = await db
    .insert(adminSessions)
    .values({
      adminId: input.adminId,
      tokenHash,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      expiresAt,
    })
    .returning();

  return { rawToken, session: session! };
}

export async function revokeAdminSessionByRawToken(rawToken: string) {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  await db
    .update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(adminSessions.tokenHash, tokenHash),
        isNull(adminSessions.revokedAt),
      ),
    );
}

export async function resolveAdminSession(rawToken: string) {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const rows = await db
    .select({
      session: adminSessions,
      admin: admins,
    })
    .from(adminSessions)
    .innerJoin(admins, eq(adminSessions.adminId, admins.id))
    .where(
      and(
        eq(adminSessions.tokenHash, tokenHash),
        isNull(adminSessions.revokedAt),
        gt(adminSessions.expiresAt, now),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
