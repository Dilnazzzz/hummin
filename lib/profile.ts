import { eq } from "drizzle-orm";
import { db } from "./db";
import { userProfiles, type UserProfile } from "./db/schema";

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const row = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) });
  return row ?? null;
}

/** Returns the profile, creating a default row on first call. */
export async function ensureProfile(userId: string): Promise<UserProfile> {
  const existing = await getProfile(userId);
  if (existing) return existing;
  const [row] = await db.insert(userProfiles).values({ userId }).onConflictDoNothing().returning();
  return row ?? (await getProfile(userId))!;
}
