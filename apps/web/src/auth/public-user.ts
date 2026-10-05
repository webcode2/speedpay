import type { users } from "@solar/database/schema";

export type PublicUser = {
  id: string;
  email: string;
  phone: string | null;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  referralCode: string;
  referredByUserId: string | null;
};

export function toPublicUser(
  user: typeof users.$inferSelect,
): PublicUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    referralCode: user.referralCode,
    referredByUserId: user.referredByUserId,
  };
}
