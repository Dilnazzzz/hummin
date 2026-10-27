import { addDays, differenceInCalendarDays, endOfDay, startOfDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { RRule } from "rrule";

/** "2026-11-01T08:00" in tz → UTC Date. */
export function localToUtc(local: string, tz: string): Date {
  return fromZonedTime(local, tz);
}

export function dateTile(date: Date, tz: string, allDay = false) {
  return {
    day: formatInTimeZone(date, tz, "EEE").toUpperCase(),
    time: allDay ? formatInTimeZone(date, tz, "d MMM") : formatInTimeZone(date, tz, "h:mm a").replace(":00", ""),
  };
}

export function formatWhen(start: Date, end: Date | null, tz: string, allDay = false) {
  const day = formatInTimeZone(start, tz, "EEE, MMM d");
  if (allDay) return day;
  const s = formatInTimeZone(start, tz, "h:mm a").replace(":00", "");
  if (!end) return `${day} · ${s}`;
  const e = formatInTimeZone(end, tz, "h:mm a").replace(":00", "");
  return `${day} · ${s}–${e}`;
}

/** "Tonight", "Tomorrow", "In 3 days", or null when further out or past. */
export function relativeChip(start: Date, tz: string, now = new Date()): string | null {
  const s = toZonedTime(start, tz);
  const n = toZonedTime(now, tz);
  if (s < n) return null;
  const days = differenceInCalendarDays(s, n);
  if (days === 0) return s.getHours() >= 17 ? "Tonight" : "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `In ${days} days`;
  return null;
}

/** Window helpers in the user's timezone, returned as UTC instants. */
export function windows(tz: string, now = new Date()) {
  const n = toZonedTime(now, tz);
  const toUtc = (d: Date) => fromZonedTime(d, tz);
  const dow = n.getDay(); // 0 Sun
  const daysToSunday = (7 - dow) % 7;
  const endOfWeek = endOfDay(addDays(n, daysToSunday));
  const daysToFriday = (5 - dow + 7) % 7;
  const friday = startOfDay(addDays(n, daysToFriday));
  const weekendStart = dow >= 5 || dow === 0 ? startOfDay(n) : new Date(friday.getTime() + 17 * 3600 * 1000);
  const weekendEnd = endOfDay(addDays(friday, dow === 0 ? -5 : 2));
  return {
    now,
    tonightEnd: toUtc(endOfDay(n)),
    weekendStart: toUtc(weekendStart),
    weekendEnd: toUtc(dow === 0 ? endOfDay(n) : weekendEnd),
    weekEnd: toUtc(endOfWeek),
  };
}

// --- recurrence -------------------------------------------------------------
// rrule works in "floating" time: we feed it local wall-clock components as if
// they were UTC, then map the result back into the event's timezone.

function toFloating(date: Date, tz: string) {
  const z = toZonedTime(date, tz);
  return new Date(Date.UTC(z.getFullYear(), z.getMonth(), z.getDate(), z.getHours(), z.getMinutes()));
}

function fromFloating(f: Date, tz: string) {
  const local = `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, "0")}-${String(f.getUTCDate()).padStart(2, "0")}T${String(f.getUTCHours()).padStart(2, "0")}:${String(f.getUTCMinutes()).padStart(2, "0")}`;
  return fromZonedTime(local, tz);
}

/** Next occurrence on or after `after` for a recurring event, else null. */
export function nextOccurrence(rrule: string | null, start: Date, tz: string, after = new Date()): Date | null {
  if (!rrule) return start >= after ? start : null;
  try {
    const opts = RRule.parseString(rrule.replace(/^RRULE:/i, ""));
    const rule = new RRule({ ...opts, dtstart: toFloating(start, tz) });
    const next = rule.after(toFloating(after, tz), true);
    return next ? fromFloating(next, tz) : null;
  } catch {
    return start >= after ? start : null;
  }
}

/** Human label for an RRULE when the model didn't provide one. */
export function describeRRule(rrule: string | null): string | null {
  if (!rrule) return null;
  try {
    return RRule.fromString(rrule.replace(/^RRULE:/i, "")).toText().replace(/^every/, "Every");
  } catch {
    return null;
  }
}
