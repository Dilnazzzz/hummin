/* Seeds a handful of listed events near Menlo Park for local dev and demos. Idempotent. */
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const { db } = await import("../lib/db");
const { events, user } = await import("../lib/db/schema");
const { eq } = await import("drizzle-orm");
const { fromZonedTime } = await import("date-fns-tz");

const SEED_USER_ID = "seed-hummin";
const TZ = "America/Los_Angeles";

function nextWeekday(dow: number, hour: number, minute = 0, weeksAhead = 0) {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() + ((dow - now.getDay() + 7) % 7) + weeksAhead * 7);
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const at = fromZonedTime(local, TZ);
  return at < now ? fromZonedTime(local, TZ) : at;
}

await db
  .insert(user)
  .values({ id: SEED_USER_ID, name: "Hummin' picks", email: "seed@hummin.app", emailVerified: true, createdAt: new Date(), updatedAt: new Date() })
  .onConflictDoNothing();

await db.delete(events).where(eq(events.userId, SEED_USER_ID));

const rows: (typeof events.$inferInsert)[] = [
  {
    userId: SEED_USER_ID, title: "Sunrise yoga in the park", category: "wellness", isListed: true, timezone: TZ,
    startAt: nextWeekday(6, 8), endAt: nextWeekday(6, 9), venueName: "Burgess Park", address: "701 Laurel St, Menlo Park, CA",
    lat: 37.4523, lng: -122.1753, priceText: "Free", isFree: true, host: "Menlo Flow", rrule: "FREQ=WEEKLY;BYDAY=SA", repeatText: "Weekly on Saturdays",
    description: "Bring a mat. All levels. Coffee after at the cafe across the street.", sourceType: "admin",
  },
  {
    userId: SEED_USER_ID, title: "Thursday night market", category: "food", isListed: true, timezone: TZ,
    startAt: nextWeekday(4, 17), endAt: nextWeekday(4, 21), venueName: "Downtown Menlo Park", address: "Santa Cruz Ave, Menlo Park, CA",
    lat: 37.4536, lng: -122.1838, priceText: "Free", isFree: true, host: "City of Menlo Park", rrule: "FREQ=WEEKLY;BYDAY=TH", repeatText: "Weekly on Thursdays",
    description: "Food trucks, produce, live music on the corner.", sourceType: "admin",
  },
  {
    userId: SEED_USER_ID, title: "Open studio: wheel throwing", category: "art", isListed: true, timezone: TZ,
    startAt: nextWeekday(0, 14), endAt: nextWeekday(0, 16), venueName: "Clay Studio Palo Alto", address: "150 Hamilton Ave, Palo Alto, CA",
    lat: 37.4443, lng: -122.1607, priceText: "$35", isFree: false, host: "Clay Studio", description: "Beginner friendly. Clay and firing included.", sourceType: "admin",
  },
  {
    userId: SEED_USER_ID, title: "Jazz on the patio", category: "music", isListed: true, timezone: TZ,
    startAt: nextWeekday(5, 19), endAt: nextWeekday(5, 21, 30), venueName: "Cafe Borrone", address: "1010 El Camino Real, Menlo Park, CA",
    lat: 37.4546, lng: -122.1838, priceText: "Free", isFree: true, host: "Cafe Borrone", rrule: "FREQ=WEEKLY;BYDAY=FR", repeatText: "Weekly on Fridays",
    description: "Trio sets from 7. Get there early for a table.", sourceType: "admin",
  },
  {
    userId: SEED_USER_ID, title: "Sunday run club", category: "fitness", isListed: true, timezone: TZ,
    startAt: nextWeekday(0, 8, 30), endAt: nextWeekday(0, 9, 30), venueName: "Stanford Dish trailhead", address: "Stanford Ave & Junipero Serra Blvd, Stanford, CA",
    lat: 37.4186, lng: -122.1714, priceText: "Free", isFree: true, host: "Peninsula Runners", rrule: "FREQ=WEEKLY;BYDAY=SU", repeatText: "Weekly on Sundays",
    description: "Easy 5k loop. Walkers welcome.", sourceType: "admin",
  },
  {
    userId: SEED_USER_ID, title: "Neighborhood tool swap", category: "community", isListed: true, timezone: TZ,
    startAt: nextWeekday(6, 10, 0, 1), endAt: nextWeekday(6, 12, 0, 1), venueName: "Menlo Park Library", address: "800 Alma St, Menlo Park, CA",
    lat: 37.4508, lng: -122.1839, priceText: "Free", isFree: true, host: "Menlo Park Library", description: "Bring a tool, take a tool. Repair table on site.", sourceType: "admin",
  },
  {
    userId: SEED_USER_ID, title: "Intro to sourdough", category: "learning", isListed: true, timezone: TZ,
    startAt: nextWeekday(3, 18, 30), endAt: nextWeekday(3, 20, 30), venueName: "Draeger's cooking school", address: "1010 University Dr, Menlo Park, CA",
    lat: 37.4538, lng: -122.1861, priceText: "$45", isFree: false, host: "Draeger's", description: "Take home a starter and a loaf.", sourceType: "admin",
  },
];

await db.insert(events).values(rows);
console.log(`Seeded ${rows.length} listed events for ${SEED_USER_ID}.`);
process.exit(0);
