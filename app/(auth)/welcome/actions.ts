"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { geocode, reverseGeocode } from "@/lib/geocode";
import { requireUser } from "@/lib/session";
import { safeNext } from "@/lib/safe-next";
import { CATEGORIES } from "@/lib/db/schema";

const onboardingSchema = z.object({
  area: z.string().trim().max(120).default(""),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  timezone: z.string().trim().min(1).max(64).default("America/Los_Angeles"),
  interests: z.array(z.enum(CATEGORIES)).default([]),
  next: z.string().default("/hum"),
  skip: z.string().optional(),
});

export async function completeOnboarding(formData: FormData) {
  const user = await requireUser("/welcome");
  const parsed = onboardingSchema.safeParse({
    area: formData.get("area") ?? "",
    lat: formData.get("lat") || undefined,
    lng: formData.get("lng") || undefined,
    timezone: formData.get("timezone") || undefined,
    interests: formData.getAll("interests"),
    next: formData.get("next") ?? "/hum",
    skip: formData.get("skip") ?? undefined,
  });
  if (!parsed.success) throw new Error("Invalid onboarding data");
  const data = parsed.data;

  let lat = data.lat ?? null;
  let lng = data.lng ?? null;
  if (!data.skip && data.area && (lat == null || lng == null)) {
    const hit = await geocode(data.area);
    if (hit) {
      lat = hit.lat;
      lng = hit.lng;
    }
  }

  const values = {
    userId: user.id,
    area: data.skip ? null : data.area || null,
    lat,
    lng,
    timezone: data.timezone,
    interests: data.skip ? [] : data.interests,
    onboardedAt: new Date(),
  };

  await db
    .insert(userProfiles)
    .values(values)
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { ...values, updatedAt: new Date() },
    });

  redirect(safeNext(data.next));
}

/** "Use my location": coordinates from the browser → a short area name. */
export async function lookupArea(lat: number, lng: number) {
  await requireUser("/welcome");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return reverseGeocode(lat, lng);
}

export async function updateProfile(formData: FormData) {
  const user = await requireUser("/settings");
  const area = String(formData.get("area") ?? "").trim().slice(0, 120);
  const radius = Math.min(25, Math.max(1, Number(formData.get("radius_miles") ?? 5) || 5));
  const interests = formData.getAll("interests").map(String).filter((i) => (CATEGORIES as readonly string[]).includes(i));
  const timezone = String(formData.get("timezone") ?? "").trim() || undefined;

  const current = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, user.id) });
  let lat = current?.lat ?? null;
  let lng = current?.lng ?? null;
  if (area && area !== current?.area) {
    const hit = await geocode(area);
    lat = hit?.lat ?? null;
    lng = hit?.lng ?? null;
  }

  await db
    .insert(userProfiles)
    .values({ userId: user.id, area: area || null, lat, lng, radiusMiles: radius, interests, timezone })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { area: area || null, lat, lng, radiusMiles: radius, interests, ...(timezone ? { timezone } : {}), updatedAt: new Date() },
    });

  redirect("/settings?saved=1");
}
