import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Calendar, ChevronLeft, ExternalLink, MapPin, Repeat, Ticket, Trash2, Users } from "lucide-react";
import { deleteEventForm, humEventForm, setGoingForm, setListedForm, skipEventForm } from "@/app/actions/events";
import { CATEGORY_LABEL, CATEGORY_TINT } from "@/components/events/category";
import { Tag } from "@/components/events/tags";
import { PageContainer } from "@/components/page-container";
import { buttonClasses, LimeDot } from "@/components/ui/button-link";
import { formatWhen, nextOccurrence, relativeChip } from "@/lib/dates";
import { canView, countGoing, getEvent, getSave } from "@/lib/events";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/e/[id]">): Promise<Metadata> {
  const { id } = await params;
  const ev = await getEvent(id);
  return { title: ev?.title ?? "Event" };
}

export default function EventPage({ params }: PageProps<"/e/[id]">) {
  return (
    <PageContainer className="lg:max-w-[1000px]">
      <Suspense fallback={<EventSkeleton />}>
        <EventContent params={params} />
      </Suspense>
    </PageContainer>
  );
}

function googleCalendarUrl(ev: NonNullable<Awaited<ReturnType<typeof getEvent>>>, at: Date) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = ev.endAt ?? new Date(at.getTime() + 2 * 3600 * 1000);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${fmt(at)}/${fmt(end)}`,
    details: [ev.description, ev.sourceUrl].filter(Boolean).join("\n\n"),
    location: [ev.venueName, ev.address].filter(Boolean).join(", "),
    ctz: ev.timezone,
  });
  if (ev.rrule) p.set("recur", `RRULE:${ev.rrule}`);
  return `https://calendar.google.com/calendar/render?${p}`;
}

async function EventContent({ params }: { params: PageProps<"/e/[id]">["params"] }) {
  const { id } = await params;
  const session = await getSession();
  const userId = session?.user.id ?? null;
  const ev = await getEvent(id);
  if (!ev || !(await canView(ev, userId))) notFound();

  const save = userId ? await getSave(userId, ev.id) : null;
  const saved = !!save && save.status !== "skipped";
  const going = save?.status === "going";
  const isOwner = userId === ev.userId;
  const tz = ev.timezone;
  const at = (ev.rrule ? nextOccurrence(ev.rrule, ev.startAt, tz) : ev.startAt) ?? ev.startAt;
  const chip = saved ? relativeChip(at, tz) : null;
  const goingCount = await countGoing(ev.id);
  const where = [ev.venueName, ev.address].filter(Boolean).join(" · ");
  const mapsUrl = ev.lat != null && ev.lng != null ? `https://www.google.com/maps/search/?api=1&query=${ev.lat},${ev.lng}` : where ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(where)}` : null;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
      <section className={cn("-mx-5 -mt-6 rounded-b-panel px-5 pb-8 pt-4 md:mx-0 md:mt-0 md:rounded-panel lg:self-start", CATEGORY_TINT[ev.category])}>
        <div className="flex items-center justify-between">
          <Link href="/hum" aria-label="Back" className="flex size-11 items-center justify-center rounded-full bg-surface/70 text-ink">
            <ChevronLeft size={22} strokeWidth={2} aria-hidden="true" />
          </Link>
          {chip ? <Tag tone="lime">{chip}</Tag> : null}
        </div>

        <div className="mt-6 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="label-caps opacity-80">{CATEGORY_LABEL[ev.category]}</p>
            <h1 className="mt-2 font-serif text-[36px] leading-[1.05] lg:text-[42px]">{ev.title}</h1>
          </div>
          {ev.imageKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/files/${ev.imageKey}`} alt="" className="h-28 w-20 shrink-0 rounded-tile border border-ink/10 object-cover" />
          ) : null}
        </div>

        <dl className="mt-5 flex flex-col gap-2 text-[15px]">
          <div className="flex items-start gap-2">
            <Calendar size={18} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
            <dd>
              {formatWhen(at, ev.rrule ? null : ev.endAt, tz, ev.allDay)}
              {ev.endAt && ev.rrule ? ` · ends ${formatWhen(ev.endAt, null, tz).split(" · ")[1]}` : null}
            </dd>
          </div>
          {where ? (
            <div className="flex items-start gap-2">
              <MapPin size={18} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
              <dd>
                {mapsUrl ? (
                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                    {where}
                  </a>
                ) : (
                  where
                )}
              </dd>
            </div>
          ) : null}
          <div className="flex items-start gap-2">
            <Ticket size={18} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
            <dd>{ev.isFree ? "Free" : ev.priceText ?? "Price not listed"}</dd>
          </div>
          {ev.repeatText ? (
            <div className="flex items-start gap-2">
              <Repeat size={18} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
              <dd>{ev.repeatText}</dd>
            </div>
          ) : null}
          {ev.host ? (
            <div className="flex items-start gap-2">
              <Users size={18} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0" />
              <dd>{ev.host}</dd>
            </div>
          ) : null}
        </dl>
        {ev.description ? <p className="mt-4 text-[15px] opacity-90">{ev.description}</p> : null}
      </section>

      <section className="mt-6 flex flex-col gap-4 lg:mt-0">
        <div className="grid grid-cols-2 gap-2">
          <form action={setGoingForm}>
            <input type="hidden" name="eventId" value={ev.id} />
            <input type="hidden" name="going" value={going ? "0" : "1"} />
            <button type="submit" aria-pressed={going} className={cn(buttonClasses({ variant: going ? "lime" : "secondary", size: "lg" }), "w-full")}>
              {going ? "You're goin'" : "I'm goin'"}
            </button>
          </form>
          {saved ? (
            <span className={cn(buttonClasses({ variant: "secondary", size: "lg" }), "w-full bg-sage text-sage-ink border-sage")}>In your hum</span>
          ) : (
            <form action={humEventForm}>
              <input type="hidden" name="eventId" value={ev.id} />
              <button type="submit" className={cn(buttonClasses({ size: "lg" }), "w-full")}>
                Hum it <LimeDot />
              </button>
            </form>
          )}
          <a href={googleCalendarUrl(ev, at)} target="_blank" rel="noreferrer" className={buttonClasses({ variant: "secondary" })}>
            Add to calendar
          </a>
          {ev.sourceUrl ? (
            <a href={ev.sourceUrl} target="_blank" rel="noreferrer" className={buttonClasses({ variant: "secondary" })}>
              Register <ExternalLink size={14} aria-hidden="true" />
            </a>
          ) : (
            <span className={cn(buttonClasses({ variant: "secondary" }), "opacity-50")}>Ask a friend</span>
          )}
        </div>

        <div className="rounded-card border border-line bg-surface p-4">
          <p className="label-caps text-muted">Reminders</p>
          <p className="mt-1 text-[15px] text-ink-2">
            {saved ? "Evening before at 6 PM and 2 hours before. Email reminders switch on in the next phase." : "Hum it to get reminders."}
          </p>
        </div>

        <div className="rounded-card border border-line bg-surface p-4">
          <p className="label-caps text-muted">Who&apos;s goin&apos;</p>
          <p className="mt-1 text-[15px] text-ink-2">{goingCount === 0 ? "Be the first to say you're goin'." : `${goingCount} ${goingCount === 1 ? "person is" : "people are"} goin'.`}</p>
        </div>

        {saved ? (
          <form action={skipEventForm} className="text-[13px]">
            <input type="hidden" name="eventId" value={ev.id} />
            <button type="submit" className="text-muted underline-offset-4 hover:underline">
              I can&apos;t make it
            </button>
          </form>
        ) : null}

        {isOwner ? (
          <div className="flex flex-col gap-3 rounded-card border border-dashed border-line-strong p-4">
            <p className="label-caps text-muted">Yours</p>
            <form action={setListedForm} className="flex items-center justify-between gap-3 text-[15px]">
              <input type="hidden" name="eventId" value={ev.id} />
              <input type="hidden" name="listed" value={ev.isListed ? "0" : "1"} />
              <span>
                <span className="font-semibold">{ev.isListed ? "Listed in Explore" : "Private"}</span>
                <span className="block text-[13px] text-muted">{ev.isListed ? "People nearby can find it." : "Only you can see it."}</span>
              </span>
              <button type="submit" className={buttonClasses({ variant: "secondary" })}>
                {ev.isListed ? "Make private" : "List it"}
              </button>
            </form>
            <form action={deleteEventForm}>
              <input type="hidden" name="eventId" value={ev.id} />
              <button type="submit" className="inline-flex items-center gap-1.5 text-[13px] text-muted underline-offset-4 hover:text-ink hover:underline">
                <Trash2 size={14} aria-hidden="true" /> Delete this event
              </button>
            </form>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function EventSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading event" className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
      <div className="-mx-5 -mt-6 min-h-[280px] animate-pulse rounded-b-panel bg-sunken md:mx-0 md:mt-0 md:rounded-panel" />
      <div className="mt-6 flex flex-col gap-3 lg:mt-0">
        <div className="h-[52px] animate-pulse rounded-chip bg-sunken" />
        <div className="h-24 animate-pulse rounded-card bg-sunken" />
      </div>
    </div>
  );
}
