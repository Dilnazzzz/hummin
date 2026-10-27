"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { localToUtc, describeRRule } from "@/lib/dates";
import { db } from "@/lib/db";
import { CATEGORIES, SOURCE_TYPES, events, saves } from "@/lib/db/schema";
import { findDuplicate, getEvent } from "@/lib/events";
import { geocode } from "@/lib/geocode";
import { getProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";

const draftSchema = z.object({
  title: z.string().trim().min(1, "Give it a name").max(200),
  description: z.string().trim().max(2000).nullable().default(null),
  startLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Add a date and time"),
  endLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable().default(null),
  allDay: z.boolean().default(false),
  timezone: z.string().min(1).max(64),
  venueName: z.string().trim().max(200).nullable().default(null),
  address: z.string().trim().max(300).nullable().default(null),
  priceText: z.string().trim().max(60).nullable().default(null),
  isFree: z.boolean().nullable().default(null),
  host: z.string().trim().max(120).nullable().default(null),
  sourceUrl: z.string().trim().max(2048).nullable().default(null),
  category: z.enum(CATEGORIES),
  rrule: z.string().trim().max(200).nullable().default(null),
  repeatText: z.string().trim().max(120).nullable().default(null),
  confidence: z.number().min(0).max(1).default(1),
  imageKey: z.string().max(200).nullable().default(null),
  sourceType: z.enum(SOURCE_TYPES).default("photo"),
  isListed: z.boolean().default(false),
  going: z.boolean().default(false),
  force: z.boolean().default(false),
  captureId: z.string().nullable().default(null),
});

export type DraftInput = z.input<typeof draftSchema>;

export type SaveDraftResult =
  | { ok: true; eventId: string }
  | { ok: false; duplicateOf: { id: string; title: string } }
  | { ok: false; error: string };

/** Confirm screen → event + save row (+ reminders later). */
export async function saveDraft(input: DraftInput): Promise<SaveDraftResult> {
  const user = await requireUser("/catch/confirm");
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details" };
  const d = parsed.data;

  const startAt = localToUtc(d.startLocal, d.timezone);
  let endAt = d.endLocal ? localToUtc(d.endLocal, d.timezone) : null;
  if (endAt && endAt < startAt) endAt = new Date(endAt.getTime() + 24 * 3600 * 1000);

  if (!d.force) {
    const dup = await findDuplicate(user.id, d.title, startAt);
    if (dup) return { ok: false, duplicateOf: { id: dup.id, title: dup.title } };
  }

  // Geocode so it shows up on the map and in distance filters.
  let lat: number | null = null;
  let lng: number | null = null;
  const where = [d.venueName, d.address].filter(Boolean).join(", ");
  if (where) {
    const profile = await getProfile(user.id);
    const bias = profile?.lat != null && profile?.lng != null ? { lat: profile.lat, lng: profile.lng } : null;
    const hit = (await geocode(where, bias)) ?? (d.address ? await geocode(d.address, bias) : null);
    if (hit) {
      lat = hit.lat;
      lng = hit.lng;
    }
  }

  const isFree = d.isFree ?? (d.priceText ? /free|\$0\b/i.test(d.priceText) : null);

  const [created] = await db
    .insert(events)
    .values({
      userId: user.id,
      title: d.title,
      description: d.description,
      category: d.category,
      startAt,
      endAt,
      timezone: d.timezone,
      allDay: d.allDay,
      venueName: d.venueName,
      address: d.address,
      lat,
      lng,
      priceText: d.priceText,
      isFree,
      host: d.host,
      sourceUrl: d.sourceUrl,
      sourceType: d.sourceType,
      imageKey: d.imageKey,
      rrule: d.rrule,
      repeatText: d.rrule ? d.repeatText ?? describeRRule(d.rrule) : null,
      isListed: d.isListed,
      aiConfidence: d.confidence,
      aiRaw: { draft: input, captureId: d.captureId },
    })
    .returning({ id: events.id });

  await db.insert(saves).values({ userId: user.id, eventId: created.id, status: d.going ? "going" : "saved" });

  revalidatePath("/hum");
  revalidatePath("/explore");
  return { ok: true, eventId: created.id };
}

/** "Hum it" on an existing (listed) event. */
export async function humEvent(eventId: string) {
  const user = await requireUser(`/e/${eventId}`);
  const ev = await getEvent(eventId);
  if (!ev || (!ev.isListed && ev.userId !== user.id && !ev.shareSlug)) return { ok: false as const, error: "Not found" };
  await db
    .insert(saves)
    .values({ userId: user.id, eventId, status: "saved" })
    .onConflictDoUpdate({ target: [saves.userId, saves.eventId], set: { status: "saved", updatedAt: new Date() } });
  revalidatePath("/hum");
  revalidatePath("/explore");
  revalidatePath(`/e/${eventId}`);
  return { ok: true as const };
}

export async function setGoing(eventId: string, going: boolean) {
  const user = await requireUser(`/e/${eventId}`);
  await db
    .insert(saves)
    .values({ userId: user.id, eventId, status: going ? "going" : "saved" })
    .onConflictDoUpdate({ target: [saves.userId, saves.eventId], set: { status: going ? "going" : "saved", updatedAt: new Date() } });
  revalidatePath("/hum");
  revalidatePath(`/e/${eventId}`);
}

/** "I can't make it": keeps the row (so we don't re-suggest it) but drops it from the hum. */
export async function skipEvent(eventId: string) {
  const user = await requireUser(`/e/${eventId}`);
  await db.update(saves).set({ status: "skipped", updatedAt: new Date() }).where(and(eq(saves.userId, user.id), eq(saves.eventId, eventId)));
  revalidatePath("/hum");
  revalidatePath(`/e/${eventId}`);
}

export async function deleteEvent(eventId: string) {
  const user = await requireUser(`/e/${eventId}`);
  const ev = await getEvent(eventId);
  if (!ev || ev.userId !== user.id) return;
  await db.delete(events).where(eq(events.id, eventId));
  revalidatePath("/hum");
  revalidatePath("/explore");
  redirect("/hum?deleted=1");
}

export async function setListed(eventId: string, listed: boolean) {
  const user = await requireUser(`/e/${eventId}`);
  const ev = await getEvent(eventId);
  if (!ev || ev.userId !== user.id) return;
  await db.update(events).set({ isListed: listed, updatedAt: new Date() }).where(eq(events.id, eventId));
  revalidatePath("/explore");
  revalidatePath(`/e/${eventId}`);
}

// Form-action wrappers (take FormData) for plain <form> buttons.
export async function humEventForm(formData: FormData) {
  await humEvent(String(formData.get("eventId")));
}
export async function setGoingForm(formData: FormData) {
  await setGoing(String(formData.get("eventId")), formData.get("going") === "1");
}
export async function skipEventForm(formData: FormData) {
  await skipEvent(String(formData.get("eventId")));
}
export async function deleteEventForm(formData: FormData) {
  await deleteEvent(String(formData.get("eventId")));
}
export async function setListedForm(formData: FormData) {
  await setListed(String(formData.get("eventId")), formData.get("listed") === "1");
}
