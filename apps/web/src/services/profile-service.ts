import { eq } from "drizzle-orm";
import { userProfiles, users } from "@solar/database/schema";
import { getDb } from "@/db";
import { AppError } from "@/lib/app-error";

export type ProfileInput = {
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  profileImage?: string | null;
};

export function isProfileComplete(profile: {
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  country: string | null;
}) {
  return Boolean(
    profile.firstName?.trim() &&
      profile.lastName?.trim() &&
      profile.dateOfBirth &&
      profile.country?.trim(),
  );
}

export async function getProfile(userId: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new AppError("NOT_FOUND", "User not found.", 404);

  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!profile) {
    throw new AppError("NOT_FOUND", "Profile not found.", 404);
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      status: user.status,
    },
    profile: {
      firstName: profile.firstName,
      middleName: profile.middleName,
      lastName: profile.lastName,
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      country: profile.country,
      profileImage: profile.profileImage,
    },
    complete: isProfileComplete(profile),
  };
}

export async function updateProfile(userId: string, input: ProfileInput) {
  const db = getDb();
  const [updated] = await db
    .update(userProfiles)
    .set({
      firstName: input.firstName ?? null,
      middleName: input.middleName ?? null,
      lastName: input.lastName ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      country: input.country ?? null,
      profileImage: input.profileImage ?? null,
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.userId, userId))
    .returning();

  if (!updated) throw new AppError("NOT_FOUND", "Profile not found.", 404);
  return getProfile(userId);
}
