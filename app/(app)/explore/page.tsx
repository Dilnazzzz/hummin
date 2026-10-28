import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Check, List, Map as MapIcon } from "lucide-react";
import { humEventForm } from "@/app/actions/events";
import { CATEGORY_LABEL, CATEGORY_TINT } from "@/components/events/category";
import { DateTile } from "@/components/events/date-tile";
import { ExploreMap, type MapPin } from "@/components/explore/explore-map";
import { PageContainer } from "@/components/page-container";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button-link";
import { dateTile, formatWhen } from "@/lib/dates";
import { CATEGORIES, type Category } from "@/lib/db/schema";
import { listExplore } from "@/lib/events";
import { getProfile } from "@/lib/profile";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Hummin' near you" };

const DEFAULT_CENTER = { lat: 37.4529, lng: -122.1817, area: "Menlo Park" };
const WHEN = [
  { key: "tonight", label: "Tonight" },
  { key: "weekend", label: "This weekend" },
  { key: "week", label: "This week" },
] as const;

export default function ExplorePage({ searchParams }: PageProps<"/explore">) {
  return (
    <PageContainer size="wide">
      <Suspense fallback={<ExploreSkeleton />}>
        <ExploreContent searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

function buildHref(sp: Record<string, string | string[] | undefined>, patch: Record<string, string | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k in patch) continue;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
    else if (v) p.set(k, v);
  }
  for (const [k, v] of Object.entries(patch)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/explore?${s}` : "/explore";
}

async function ExploreContent({ searchParams }: { searchParams: PageProps<"/explore">["searchParams"] }) {
  await connection(); // request-time from here on, so reading the clock below is allowed
  const now = new Date();
  const sp = await searchParams;
  const session = await getSession();
  const userId = session?.user.id ?? null;
  const profile = userId ? await getProfile(userId) : null;
  const tz = profile?.timezone ?? "America/Los_Angeles";
  const center = profile?.lat != null && profile?.lng != null ? { lat: profile.lat, lng: profile.lng } : { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng };
  const area = profile?.area ?? DEFAULT_CENTER.area;
  const radius = profile?.radiusMiles ?? 5;

  const when = sp.when === "tonight" || sp.when === "weekend" || sp.when === "week" ? sp.when : null;
  const free = sp.free === "1";
  const cats = (Array.isArray(sp.cat) ? sp.cat : sp.cat ? [sp.cat] : []).filter((c): c is Category => (CATEGORIES as readonly string[]).includes(c));
  const view = sp.view === "map" ? "map" : "list";
  const all = sp.all === "1";

  const items = await listExplore(userId, tz, { when, free, categories: cats, center, radiusMiles: all ? undefined : radius }, now);
  const pins: MapPin[] = items
    .filter((i) => i.event.lat != null && i.event.lng != null)
    .map((i) => ({
      id: i.event.id,
      title: i.event.title,
      lat: i.event.lat!,
      lng: i.event.lng!,
      category: i.event.category,
      when: formatWhen(i.at, null, tz, i.event.allDay),
      place: i.event.venueName ?? i.event.address,
    }));

  const chip = (active: boolean, href: string, label: string, extra?: string) => (
    <Link
      key={label}
      href={href}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-chip px-4 text-sm font-semibold transition-colors",
        active ? "bg-ink text-paper" : extra ?? "border border-line-strong bg-surface text-ink hover:bg-sunken",
      )}
    >
      {active ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : null}
      {label}
    </Link>
  );

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="title-screen">Hummin&apos; near you</h1>
        <p className="text-[15px] text-muted">
          {all ? "Everywhere" : `${area} · within ${radius} mi`} ·{" "}
          <Link href={all ? buildHref(sp, { all: null }) : buildHref(sp, { all: "1" })} className="underline underline-offset-4">
            {all ? "nearby only" : "show everywhere"}
          </Link>
          {userId ? (
            <>
              {" "}·{" "}
              <Link href="/settings" className="underline underline-offset-4">
                change area
              </Link>
            </>
          ) : null}
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {WHEN.map((w) => chip(when === w.key, buildHref(sp, { when: when === w.key ? null : w.key }), w.label))}
        {chip(free, buildHref(sp, { free: free ? null : "1" }), "Free")}
        <span className="ml-auto flex gap-1 rounded-chip bg-sunken p-1 lg:hidden" role="group" aria-label="List or map">
          <Link href={buildHref(sp, { view: null })} aria-pressed={view === "list"} className={cn("flex size-9 items-center justify-center rounded-chip", view === "list" ? "bg-ink text-paper" : "text-ink-2")}>
            <List size={18} aria-hidden="true" />
            <span className="sr-only">List</span>
          </Link>
          <Link href={buildHref(sp, { view: "map" })} aria-pressed={view === "map"} className={cn("flex size-9 items-center justify-center rounded-chip", view === "map" ? "bg-ink text-paper" : "text-ink-2")}>
            <MapIcon size={18} aria-hidden="true" />
            <span className="sr-only">Map</span>
          </Link>
        </span>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((c) => {
          const active = cats.includes(c);
          const next = active ? cats.filter((x) => x !== c) : [...cats, c];
          const p = new URLSearchParams();
          for (const [k, v] of Object.entries(sp)) {
            if (k === "cat") continue;
            if (Array.isArray(v)) v.forEach((x) => p.append(k, x));
            else if (v) p.set(k, v);
          }
          next.forEach((x) => p.append("cat", x));
          const href = p.toString() ? `/explore?${p}` : "/explore";
          return (
            <Link
              key={c}
              href={href}
              aria-pressed={active}
              className={cn("inline-flex min-h-10 shrink-0 items-center rounded-chip px-4 text-sm font-semibold", active ? "bg-ink text-paper" : CATEGORY_TINT[c])}
            >
              {CATEGORY_LABEL[c]}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr] lg:items-start">
        <div className={cn("flex flex-col gap-3", view === "map" && "hidden lg:flex")}>
          <p className="text-[15px] text-muted">
            {items.length} {items.length === 1 ? "thing" : "things"} hummin&apos;
          </p>
          {items.length === 0 ? (
            <EmptyState title="Quiet for now" body="Try another day or category, or widen the area.">
              <Link href="/explore" className={buttonClasses({ variant: "secondary" })}>
                Reset filters
              </Link>
              {!all ? (
                <Link href={buildHref(sp, { all: "1" })} className={buttonClasses({ variant: "secondary" })}>
                  Show everywhere
                </Link>
              ) : null}
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {items.map(({ event: ev, at, distance, saved }) => {
                const tile = dateTile(at, tz, ev.allDay);
                return (
                  <li key={ev.id} className="flex items-center gap-3 rounded-card border border-line bg-surface p-3">
                    <Link href={`/e/${ev.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <DateTile day={tile.day} time={tile.time} category={ev.category} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{ev.title}</span>
                        <span className="block truncate text-[13px] text-muted">{formatWhen(at, null, tz, ev.allDay)}</span>
                        <span className="block truncate text-[13px] text-muted">
                          {ev.venueName ?? ev.address ?? "Place TBC"}
                          {distance != null ? ` · ${distance < 10 ? distance.toFixed(1) : Math.round(distance)} mi` : ""}
                          {ev.priceText ? ` · ${ev.isFree ? "Free" : ev.priceText}` : ""}
                        </span>
                      </span>
                    </Link>
                    {saved ? (
                      <span className="inline-flex min-h-10 items-center rounded-chip bg-sage px-3 text-sm font-semibold text-sage-ink">Saved</span>
                    ) : (
                      <form action={humEventForm}>
                        <input type="hidden" name="eventId" value={ev.id} />
                        <button type="submit" className="inline-flex min-h-10 items-center rounded-chip bg-ink px-3 text-sm font-semibold text-paper">
                          Hum it
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className={cn("overflow-hidden rounded-panel border border-line bg-surface lg:sticky lg:top-10 lg:block", view === "map" ? "block" : "hidden")}>
          <ExploreMap pins={pins} center={center} className="h-[60dvh] min-h-[360px] w-full lg:h-[calc(100dvh-120px)]" />
        </div>
      </div>
    </>
  );
}

function ExploreSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <div className="h-11 w-72 animate-pulse rounded-tile bg-sunken" />
      <div className="h-4 w-40 animate-pulse rounded bg-sunken" />
      <div className="mt-2 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-24 animate-pulse rounded-chip bg-sunken" />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[84px] animate-pulse rounded-card bg-sunken" />
      ))}
    </div>
  );
}
