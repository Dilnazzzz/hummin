import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Better Auth tables (user, session, account, verification) live in auth-schema.ts.
export * from "./auth-schema";

export const CATEGORIES = ["wellness", "food", "art", "music", "community", "fitness", "learning"] as const;
export type Category = (typeof CATEGORIES)[number];
export const categoryEnum = pgEnum("category", CATEGORIES);

export const SOURCE_TYPES = ["photo", "upload", "link", "text", "admin"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];
export const sourceTypeEnum = pgEnum("source_type", SOURCE_TYPES);

export const SAVE_STATUSES = ["saved", "going", "went", "skipped"] as const;
export type SaveStatus = (typeof SAVE_STATUSES)[number];
export const saveStatusEnum = pgEnum("save_status", SAVE_STATUSES);

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId());

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => new Date());

/** Per-user preferences. One row per user, created on first sign-in. */
export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  area: text("area"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  radiusMiles: integer("radius_miles").notNull().default(5),
  interests: text("interests").array().notNull().default(sql`'{}'::text[]`),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  reminderEvening: boolean("reminder_evening").notNull().default(true),
  reminderHoursBefore: integer("reminder_hours_before").notNull().default(2),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const events = pgTable(
  "events",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    category: categoryEnum("category").notNull().default("community"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }),
    timezone: text("timezone").notNull(),
    allDay: boolean("all_day").notNull().default(false),
    venueName: text("venue_name"),
    address: text("address"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    priceText: text("price_text"),
    isFree: boolean("is_free"),
    host: text("host"),
    sourceUrl: text("source_url"),
    sourceType: sourceTypeEnum("source_type").notNull().default("photo"),
    imageKey: text("image_key"),
    rrule: text("rrule"),
    repeatText: text("repeat_text"),
    isListed: boolean("is_listed").notNull().default(false),
    shareSlug: text("share_slug"),
    aiConfidence: real("ai_confidence"),
    aiRaw: jsonb("ai_raw"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("events_user_idx").on(t.userId),
    index("events_listed_start_idx").on(t.isListed, t.startAt),
    uniqueIndex("events_share_slug_idx").on(t.shareSlug),
  ],
);

export const saves = pgTable(
  "saves",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    status: saveStatusEnum("status").notNull().default("saved"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("saves_user_idx").on(t.userId), uniqueIndex("saves_user_event_idx").on(t.userId, t.eventId)],
);

export const reminders = pgTable(
  "reminders",
  {
    id: id(),
    saveId: text("save_id")
      .notNull()
      .references(() => saves.id, { onDelete: "cascade" }),
    occurrenceAt: timestamp("occurrence_at", { withTimezone: true }).notNull(),
    sendAt: timestamp("send_at", { withTimezone: true }).notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    channel: text("channel").notNull().default("email"),
    createdAt: createdAt(),
  },
  (t) => [index("reminders_send_at_idx").on(t.sendAt).where(sql`${t.sentAt} is null`)],
);

/** Every extraction attempt, for debugging and cost tracking. */
export const captures = pgTable(
  "captures",
  {
    id: id(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    imageKey: text("image_key"),
    rawText: text("raw_text"),
    sourceUrl: text("source_url"),
    extracted: jsonb("extracted"),
    model: text("model"),
    promptVersion: text("prompt_version"),
    latencyMs: integer("latency_ms"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("captures_user_created_idx").on(t.userId, t.createdAt)],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Save = typeof saves.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type Capture = typeof captures.$inferSelect;
