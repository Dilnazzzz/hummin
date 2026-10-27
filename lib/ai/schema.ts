import { z } from "zod";
import { CATEGORIES } from "../db/schema";

/**
 * What the model fills in. Kept free of regex/format constraints so it works
 * as a constrained-decoding schema; stricter checks happen in post-processing.
 */
export const extractedEventSchema = z.object({
  title: z.string().describe("Event name as written, title case, no emoji"),
  description: z.string().nullable().describe("One or two sentences from the source, or null"),
  start_local: z
    .string()
    .nullable()
    .describe("Local start as YYYY-MM-DDTHH:mm (24h). For all-day use T00:00. null if no date is visible"),
  end_local: z.string().nullable().describe("Local end as YYYY-MM-DDTHH:mm, or null"),
  all_day: z.boolean(),
  timezone: z.string().describe("IANA timezone the times are in, usually the user's timezone"),
  venue_name: z.string().nullable(),
  address: z.string().nullable().describe("Street address or 'Venue, City' if that's all that is shown"),
  price_text: z.string().nullable().describe("Price exactly as shown, e.g. '$15', 'Free', '$10-20'"),
  is_free: z.boolean().nullable(),
  host: z.string().nullable().describe("Organizer, studio, business or Instagram handle"),
  source_url: z.string().nullable().describe("Registration or info URL if visible"),
  category: z.enum(CATEGORIES),
  rrule: z.string().nullable().describe("RFC 5545 RRULE without the 'RRULE:' prefix if it repeats, else null"),
  repeat_text: z.string().nullable().describe("Human label like 'Weekly on Saturdays' or 'First Sunday monthly'"),
  confidence: z.number().min(0).max(1).describe("How sure you are the title, date and time are right"),
  missing_fields: z.array(z.string()).describe("Field names that were not visible in the source"),
});

export const extractionSchema = z.object({
  events: z.array(extractedEventSchema).describe("Every distinct event found; empty if none"),
});

export type ExtractedEvent = z.infer<typeof extractedEventSchema>;
export type Extraction = z.infer<typeof extractionSchema>;

/** Strict post-validation for the local datetime strings the model returns. */
export const localDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
