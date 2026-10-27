import Link from "next/link";
import { dateTile } from "@/lib/dates";
import type { Event, SaveStatus } from "@/lib/db/schema";
import { DateTile } from "./date-tile";
import { Tag } from "./tags";

type Props = { event: Event; at: Date; tz: string; status?: SaveStatus | null };

/** Whole card is one link: DateTile + title + place + tags. */
export function EventCard({ event, at, tz, status }: Props) {
  const tile = dateTile(at, tz, event.allDay);
  const place = event.venueName ?? event.address ?? (event.host ? `by ${event.host}` : "Place to be confirmed");
  return (
    <Link
      href={`/e/${event.id}`}
      className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 transition-colors hover:border-line-strong"
    >
      <DateTile day={tile.day} time={tile.time} category={event.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-ink">{event.title}</p>
        <p className="truncate text-[13px] text-muted">{place}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {event.priceText ? <Tag>{event.isFree ? "Free" : event.priceText}</Tag> : null}
          {event.repeatText ? <Tag>{shortRepeat(event.repeatText)}</Tag> : null}
          {status === "going" ? <Tag tone="lime">Goin&apos;</Tag> : null}
        </div>
      </div>
    </Link>
  );
}

function shortRepeat(text: string) {
  const t = text.toLowerCase();
  if (t.startsWith("every week") || t.startsWith("weekly")) return "Weekly";
  if (t.includes("month")) return "Monthly";
  if (t.includes("day")) return "Daily";
  return text.length > 18 ? "Repeats" : text;
}
