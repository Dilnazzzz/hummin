import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "./db";
import { events, saves, type Category, type Event, type SaveStatus } from "./db/schema";
import { nextOccurrence, windows } from "./dates";
import { distanceMiles } from "./geocode";

type HumItem = {
  event: Event;
  status: SaveStatus;
  /** The occurrence this item is about (next one for recurring events). */
  at: Date;
};

export type HumLists = { thisWeek: HumItem[]; upcoming: HumItem[]; recurring: HumItem[]; total: number };

/** Everything the user saved, split into the three tabs. */
export async function listHum(userId: string, tz: string, now = new Date()): Promise<HumLists> {
  const rows = await db
    .select({ event: events, status: saves.status })
    .from(saves)
    .innerJoin(events, eq(saves.eventId, events.id))
    .where(and(eq(saves.userId, userId), sql`${saves.status} <> 'skipped'`))
    .orderBy(events.startAt);

  const w = windows(tz, now);
  const items: HumItem[] = [];
  for (const r of rows) {
    const at = r.event.rrule ? nextOccurrence(r.event.rrule, r.event.startAt, r.event.timezone, now) : r.event.startAt;
    if (!at) continue;
    const endGrace = r.event.endAt ?? new Date(at.getTime() + 3 * 3600 * 1000);
    if (!r.event.rrule && endGrace < now) continue; // past one-off events drop out
    items.push({ event: r.event, status: r.status, at });
  }
  items.sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    thisWeek: items.filter((i) => i.at <= w.weekEnd),
    upcoming: items.filter((i) => i.at > w.weekEnd),
    recurring: items.filter((i) => !!i.event.rrule),
    total: items.length,
  };
}

export async function getEvent(id: string): Promise<Event | null> {
  const row = await db.query.events.findFirst({ where: eq(events.id, id) });
  return row ?? null;
}

export async function getSave(userId: string, eventId: string) {
  const row = await db.query.saves.findFirst({ where: and(eq(saves.userId, userId), eq(saves.eventId, eventId)) });
  return row ?? null;
}

export async function countGoing(eventId: string) {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(saves)
    .where(and(eq(saves.eventId, eventId), eq(saves.status, "going")));
  return n;
}

/** Can this viewer see the event page? Owner, listed, or saved by the viewer. */
export async function canView(event: Event, userId: string | null) {
  if (event.isListed || event.shareSlug) return true;
  if (!userId) return false;
  if (event.userId === userId) return true;
  return !!(await getSave(userId, event.id));
}

export type ExploreFilters = {
  when?: "tonight" | "weekend" | "week" | null;
  free?: boolean;
  categories?: Category[];
  center?: { lat: number; lng: number } | null;
  radiusMiles?: number;
};

export type ExploreItem = { event: Event; at: Date; distance: number | null; saved: boolean };

/** Listed events happening from now on, filtered, with distance and whether the viewer saved them. */
export async function listExplore(userId: string | null, tz: string, f: ExploreFilters, now = new Date()): Promise<ExploreItem[]> {
  const w = windows(tz, now);
  const horizon = new Date(now.getTime() + 60 * 24 * 3600 * 1000);
  const conds = [eq(events.isListed, true), lte(events.startAt, horizon)];
  if (f.free) conds.push(eq(events.isFree, true));
  if (f.categories?.length) conds.push(inArray(events.category, f.categories));

  const rows = await db.select().from(events).where(and(...conds)).orderBy(events.startAt).limit(300);
  const savedIds = new Set<string>();
  if (userId && rows.length) {
    const s = await db
      .select({ eventId: saves.eventId })
      .from(saves)
      .where(and(eq(saves.userId, userId), inArray(saves.eventId, rows.map((r) => r.id)), sql`${saves.status} <> 'skipped'`));
    for (const x of s) savedIds.add(x.eventId);
  }

  const out: ExploreItem[] = [];
  for (const ev of rows) {
    const at = ev.rrule ? nextOccurrence(ev.rrule, ev.startAt, ev.timezone, now) : ev.startAt;
    if (!at) continue;
    if (!ev.rrule && (ev.endAt ?? new Date(at.getTime() + 3 * 3600 * 1000)) < now) continue;
    if (f.when === "tonight" && at > w.tonightEnd) continue;
    if (f.when === "weekend" && (at < w.weekendStart || at > w.weekendEnd)) continue;
    if (f.when === "week" && at > w.weekEnd) continue;
    const distance =
      f.center && ev.lat != null && ev.lng != null ? distanceMiles(f.center, { lat: ev.lat, lng: ev.lng }) : null;
    if (f.center && f.radiusMiles && distance != null && distance > f.radiusMiles) continue;
    out.push({ event: ev, at, distance, saved: savedIds.has(ev.id) });
  }
  out.sort((a, b) => a.at.getTime() - b.at.getTime());
  return out;
}

// --- duplicate detection ----------------------------------------------------

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function bigrams(s: string) {
  const out = new Map<string, number>();
  const t = normalize(s).replace(/ /g, "");
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    out.set(g, (out.get(g) ?? 0) + 1);
  }
  return out;
}

/** Dice coefficient on character bigrams, 0..1. */
function titleSimilarity(a: string, b: string) {
  const A = bigrams(a);
  const B = bigrams(b);
  let overlap = 0;
  for (const [g, n] of A) overlap += Math.min(n, B.get(g) ?? 0);
  const total = [...A.values()].reduce((x, y) => x + y, 0) + [...B.values()].reduce((x, y) => x + y, 0);
  return total === 0 ? 0 : (2 * overlap) / total;
}

/** Same user, similar title, start within ±2h → likely duplicate. */
export async function findDuplicate(userId: string, title: string, startAt: Date): Promise<Event | null> {
  const lo = new Date(startAt.getTime() - 2 * 3600 * 1000);
  const hi = new Date(startAt.getTime() + 2 * 3600 * 1000);
  const candidates = await db
    .select({ event: events })
    .from(events)
    .innerJoin(saves, and(eq(saves.eventId, events.id), eq(saves.userId, userId)))
    .where(and(gte(events.startAt, lo), lte(events.startAt, hi)))
    .orderBy(desc(events.createdAt))
    .limit(20);
  for (const c of candidates) {
    if (titleSimilarity(c.event.title, title) >= 0.75) return c.event;
  }
  return null;
}
