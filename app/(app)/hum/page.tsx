import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Settings } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { Logo } from "@/components/logo";
import { PageContainer } from "@/components/page-container";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button-link";
import { Toast } from "@/components/ui/toast";
import { listHum } from "@/lib/events";
import { ensureProfile } from "@/lib/profile";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Your hum" };

const TABS = [
  { key: "week", label: "This week" },
  { key: "upcoming", label: "Upcoming" },
  { key: "recurring", label: "Recurring" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function HumPage({ searchParams }: PageProps<"/hum">) {
  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between lg:hidden">
        <Logo size={26} />
        <Link href="/settings" aria-label="Settings" className="flex size-11 items-center justify-center rounded-full border border-line bg-surface text-ink">
          <Settings size={20} strokeWidth={1.8} aria-hidden="true" />
        </Link>
      </div>
      <Suspense fallback={<HumSkeleton />}>
        <HumContent searchParams={searchParams} />
      </Suspense>
    </PageContainer>
  );
}

async function HumContent({ searchParams }: { searchParams: PageProps<"/hum">["searchParams"] }) {
  const user = await requireUser("/hum");
  const sp = await searchParams;
  const profile = await ensureProfile(user.id);
  const tz = profile.timezone;
  const lists = await listHum(user.id, tz);
  const tab: TabKey = sp.tab === "upcoming" || sp.tab === "recurring" ? sp.tab : "week";
  const items = tab === "week" ? lists.thisWeek : tab === "upcoming" ? lists.upcoming : lists.recurring;
  const saved = typeof sp.saved === "string" ? Number(sp.saved) : 0;

  return (
    <>
      {saved > 0 ? <Toast message={saved === 1 ? "Saved to your hum" : `Saved ${saved} events to your hum`} /> : null}
      {sp.deleted ? <Toast message="Removed" /> : null}

      <header className="flex flex-col gap-2">
        <h1 className="title-screen">Your hum</h1>
        <p className="text-[15px] text-muted">
          {lists.total} saved · {lists.thisWeek.length} this week
        </p>
      </header>

      <nav aria-label="Your hum views" className="mt-6 flex gap-1 rounded-chip bg-sunken p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "week" ? "/hum" : `/hum?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "flex min-h-10 flex-1 items-center justify-center rounded-chip text-sm font-semibold transition-colors",
              tab === t.key ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="flex flex-1 flex-col gap-3">
          {items.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              body={tab === "week" ? "Snap a flyer or browse Explore to fill your hum." : tab === "upcoming" ? "Nothing beyond this week so far." : "No repeating events yet. Weekly classes and monthly markets land here."}
            >
              <ButtonLink href="/catch">Catch an event</ButtonLink>
              <ButtonLink href="/explore" variant="secondary">
                Explore
              </ButtonLink>
            </EmptyState>
          ) : (
            items.map((i) => <EventCard key={i.event.id} event={i.event} at={i.at} tz={tz} status={i.status} />)
          )}
        </div>

        <Link
          href="/explore?when=weekend"
          className="flex flex-col gap-2 rounded-panel bg-ink p-5 text-paper transition-colors hover:bg-ink-2 lg:w-[260px] lg:shrink-0"
        >
          <span className="label-caps text-lime">This weekend near you</span>
          <span className="text-base font-semibold">See what&apos;s hummin&apos; in Explore</span>
          <span className="text-sm text-paper/75">{profile.area ? `Listed events around ${profile.area}.` : "Set your area in Settings for nearby picks."}</span>
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold">
            Open Explore <ArrowRight size={16} aria-hidden="true" />
          </span>
        </Link>
      </div>
    </>
  );
}

function HumSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <div className="h-11 w-48 animate-pulse rounded-tile bg-sunken" />
      <div className="h-4 w-32 animate-pulse rounded bg-sunken" />
      <div className="mt-2 h-12 animate-pulse rounded-chip bg-sunken" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[84px] animate-pulse rounded-card bg-sunken" />
      ))}
    </div>
  );
}
