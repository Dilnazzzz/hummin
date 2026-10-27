"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { saveDraft, type DraftInput } from "@/app/actions/events";
import { CATEGORY_LABEL } from "@/components/events/category";
import { buttonClasses, LimeDot } from "@/components/ui/button-link";
import type { DraftEvent } from "@/lib/ai/extract";
import { authClient } from "@/lib/auth-client";
import { CATEGORIES, type Category } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { clearDraftBundle, getDraftServerSnapshot, getDraftSnapshot, subscribeDraft, type DraftBundle } from "./draft-store";

type Repeat = "none" | "weekly" | "biweekly" | "monthly" | "custom";

const DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function repeatFrom(rrule: string | null): Repeat {
  if (!rrule) return "none";
  const r = rrule.toUpperCase();
  if (/FREQ=WEEKLY/.test(r) && /INTERVAL=2/.test(r)) return "biweekly";
  if (/FREQ=WEEKLY/.test(r) && !/INTERVAL=/.test(r)) return "weekly";
  if (/FREQ=MONTHLY/.test(r)) return "monthly";
  return "custom";
}

function buildRRule(repeat: Repeat, startLocal: string | null, existing: string | null): { rrule: string | null; text: string | null } {
  if (repeat === "none") return { rrule: null, text: null };
  if (repeat === "custom") return { rrule: existing, text: null };
  const d = startLocal ? new Date(`${startLocal}:00`) : new Date();
  const day = DAYS[d.getDay()];
  const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
  if (repeat === "weekly") return { rrule: `FREQ=WEEKLY;BYDAY=${day}`, text: `Weekly on ${dayName}s` };
  if (repeat === "biweekly") return { rrule: `FREQ=WEEKLY;INTERVAL=2;BYDAY=${day}`, text: `Every other ${dayName}` };
  const nth = Math.ceil(d.getDate() / 7);
  const ord = ["first", "second", "third", "fourth", "fifth"][nth - 1] ?? "first";
  return { rrule: `FREQ=MONTHLY;BYDAY=${nth}${day}`, text: `${ord[0].toUpperCase()}${ord.slice(1)} ${dayName} monthly` };
}

function split(local: string | null) {
  if (!local) return { date: "", time: "" };
  const [date, time] = local.split("T");
  return { date, time };
}

export function ConfirmClient() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const bundle = useSyncExternalStore(subscribeDraft, getDraftSnapshot, getDraftServerSnapshot);
  const [index, setIndex] = useState(0);
  // null = "all selected" / "default", until the user changes it.
  const [selectedState, setSelected] = useState<Set<number> | null>(null);
  const [reviewingState, setReviewing] = useState<boolean | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const selected = selectedState ?? new Set((bundle?.events ?? []).map((_, i) => i));
  const reviewing = reviewingState ?? (bundle?.events.length === 1);

  if (bundle === undefined) return <div aria-busy="true" className="mx-auto max-w-[640px] px-5 pt-10"><div className="h-40 animate-pulse rounded-card bg-sunken" /></div>;

  if (!bundle || bundle.events.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4 px-5 pt-10">
        <h1 className="title-screen">Nothing to confirm</h1>
        <p className="text-[15px] text-ink-2">Catch a flyer first and we&apos;ll bring you here.</p>
        <Link href="/catch" className={buttonClasses({ size: "lg", className: "self-start" })}>
          Catch an event
        </Link>
      </div>
    );
  }

  const order = [...selected].sort((a, b) => a - b);
  const current = reviewing ? order[index] : null;
  const total = order.length;

  function finish(count: number) {
    clearDraftBundle();
    router.push(`/hum?saved=${count}`);
  }

  if (!reviewing) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-5 pt-6 lg:max-w-[720px] lg:pt-10">
        <header className="flex flex-col gap-3">
          <h1 className="title-screen">We found {bundle.events.length} events</h1>
          <p className="text-[15px] text-ink-2">Untick anything you don&apos;t want. You&apos;ll check each one next.</p>
        </header>
        <ul className="mt-6 flex flex-col gap-2">
          {bundle.events.map((ev, i) => {
            const unclear = !ev.startLocal;
            const on = selected.has(i);
            return (
              <li key={i}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-card border p-4",
                    unclear ? "border-warn-line bg-warn" : "border-line bg-surface",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(i);
                      else next.delete(i);
                      setSelected(next);
                    }}
                    className="mt-1 size-5 accent-ink"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{ev.title || "Untitled event"}</span>
                    <span className="block text-[13px] text-muted">
                      {ev.startLocal ? ev.startLocal.replace("T", " · ") : "Date unclear · you'll add it next"}
                      {ev.venueName ? ` · ${ev.venueName}` : ""}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={total === 0}
            onClick={() => {
              setIndex(0);
              setReviewing(true);
            }}
            className={buttonClasses({ size: "lg" })}
          >
            Review {total} {total === 1 ? "event" : "events"}
          </button>
          <Link href="/catch" onClick={clearDraftBundle} className={buttonClasses({ variant: "secondary", size: "lg" })}>
            Retake
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ConfirmOne
      key={current}
      draft={bundle.events[current!]}
      imageKey={bundle.imageKeys[0] ?? null}
      bundle={bundle}
      position={total > 1 ? { index: index + 1, total } : null}
      signedIn={isPending ? null : !!session}
      onSaved={() => {
        const n = savedCount + 1;
        setSavedCount(n);
        if (index + 1 < total) setIndex(index + 1);
        else finish(n);
      }}
      onSkip={() => {
        if (index + 1 < total) setIndex(index + 1);
        else if (savedCount > 0) finish(savedCount);
        else {
          clearDraftBundle();
          router.push("/catch");
        }
      }}
    />
  );
}

type OneProps = {
  draft: DraftEvent;
  imageKey: string | null;
  bundle: DraftBundle;
  position: { index: number; total: number } | null;
  signedIn: boolean | null;
  onSaved: () => void;
  onSkip: () => void;
};

function ConfirmOne({ draft, imageKey, bundle, position, signedIn, onSaved, onSkip }: OneProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(draft.title);
  const [date, setDate] = useState(split(draft.startLocal).date);
  const [startTime, setStartTime] = useState(split(draft.startLocal).time);
  const [endTime, setEndTime] = useState(split(draft.endLocal).time);
  const [allDay, setAllDay] = useState(draft.allDay);
  const [venueName, setVenueName] = useState(draft.venueName ?? "");
  const [address, setAddress] = useState(draft.address ?? "");
  const [priceText, setPriceText] = useState(draft.priceText ?? "");
  const [host, setHost] = useState(draft.host ?? "");
  const [category, setCategory] = useState<Category>(draft.category);
  const [repeat, setRepeat] = useState<Repeat>(repeatFrom(draft.rrule));
  const [description, setDescription] = useState(draft.description ?? "");
  const [listed, setListed] = useState(false);
  const [going, setGoing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dup, setDup] = useState<{ id: string; title: string } | null>(null);

  const missing = new Set(draft.missingFields);
  const startLocal = date && (allDay || startTime) ? `${date}T${allDay ? "00:00" : startTime}` : null;
  const endLocal = date && endTime && !allDay ? `${date}T${endTime}` : null;
  const rr = useMemo(() => buildRRule(repeat, startLocal, draft.rrule), [repeat, startLocal, draft.rrule]);

  const found = [title, date, allDay || startTime, venueName || address, priceText, host, category].filter(Boolean).length;

  function submit(force = false) {
    setError(null);
    if (signedIn === false) {
      router.push("/login?next=/catch/confirm");
      return;
    }
    if (!title.trim()) return setError("Give it a name.");
    if (!startLocal) return setError("Add a date and time.");
    const input: DraftInput = {
      title: title.trim(),
      description: description.trim() || null,
      startLocal,
      endLocal,
      allDay,
      timezone: draft.timezone,
      venueName: venueName.trim() || null,
      address: address.trim() || null,
      priceText: priceText.trim() || null,
      isFree: priceText.trim() ? /free|\$0\b/i.test(priceText) : null,
      host: host.trim() || null,
      sourceUrl: draft.sourceUrl,
      category,
      rrule: rr.rrule,
      repeatText: rr.text ?? draft.repeatText,
      confidence: draft.confidence,
      imageKey,
      sourceType: bundle.sourceType,
      isListed: listed,
      going,
      force,
      captureId: bundle.captureId,
    };
    start(async () => {
      const res = await saveDraft(input);
      if (res.ok) {
        setDup(null);
        onSaved();
      } else if ("duplicateOf" in res) setDup(res.duplicateOf);
      else setError(res.error);
    });
  }

  const field = (label: string, key: string, input: React.ReactNode, wide = false) => {
    const isMissing = missing.has(key) && !valueFor(key);
    return (
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1 rounded-tile border px-4 py-3",
          isMissing ? "border-warn-line bg-warn" : "border-line bg-surface",
          wide && "col-span-2",
        )}
      >
        <span className="text-xs font-medium text-muted">{label}</span>
        {input}
        {isMissing ? <span className="text-xs font-medium text-warn-ink">Not on the flyer</span> : null}
      </div>
    );
  };

  function valueFor(key: string) {
    switch (key) {
      case "start_local":
        return date && (allDay || startTime);
      case "end_local":
        return endTime;
      case "address":
      case "venue_name":
        return venueName || address;
      case "price_text":
        return priceText;
      case "host":
        return host;
      default:
        return true;
    }
  }

  const inputCls = "w-full min-w-0 bg-transparent text-base text-ink placeholder:text-faint outline-none";

  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-6 lg:max-w-[720px] lg:pt-10">
      <header className="flex flex-col gap-3">
        {position ? <p className="label-caps text-muted">Event {position.index} of {position.total}</p> : null}
        <h1 className="title-screen">Is this right?</h1>
        <p className="text-[15px] text-ink-2">Check the details before it&apos;s saved.</p>
        <div className="flex items-center gap-3">
          <span className={cn("inline-flex w-fit items-center gap-2 rounded-chip px-3 py-1.5 text-xs font-semibold", found >= 6 ? "bg-sage text-sage-ink" : "bg-warn text-warn-ink")}>
            Found {found} of 7 details
          </span>
          {draft.confidence < 0.6 && bundle.source !== "manual" ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-warn-ink">
              <AlertTriangle size={14} aria-hidden="true" /> Low confidence, check the date
            </span>
          ) : null}
        </div>
      </header>

      {imageKey ? (
        <div className="mt-5 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/files/${imageKey}`} alt="Your flyer" className="h-28 w-20 rounded-tile border border-line object-cover" />
          <p className="text-[13px] text-muted">Your flyer, so you can compare while you check.</p>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3">
        {field("Event", "title", <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's it called?" className={inputCls} />, true)}
        {field("Date", "start_local", <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />)}
        {field(
          "All day",
          "all_day",
          <label className="flex min-h-6 items-center gap-2 text-base">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="size-5 accent-ink" />
            {allDay ? "Yes" : "No"}
          </label>,
        )}
        {!allDay ? field("Starts", "start_local", <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />) : null}
        {!allDay ? field("Ends", "end_local", <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />) : null}
        {field("Where", "venue_name", <input value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="Venue or place" className={inputCls} />, true)}
        {field("Address", "address", <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city" autoComplete="off" className={inputCls} />, true)}
        {field("Price", "price_text", <input value={priceText} onChange={(e) => setPriceText(e.target.value)} placeholder="Free, $15…" className={inputCls} />)}
        {field(
          "Repeats",
          "rrule",
          <select value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)} className={inputCls}>
            <option value="none">Once</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Every other week</option>
            <option value="monthly">Monthly</option>
            {draft.rrule && repeatFrom(draft.rrule) === "custom" ? <option value="custom">{draft.repeatText ?? "Custom"}</option> : null}
          </select>,
        )}
        {field("Host", "host", <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="Who's running it?" className={inputCls} />)}
        {field(
          "Category",
          "category",
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className={inputCls}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>,
        )}
        {field(
          "Notes",
          "description",
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Anything worth remembering" className={cn(inputCls, "resize-y")} />,
          true,
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
        <label className="flex items-center justify-between gap-3 text-[15px]">
          <span>
            <span className="font-semibold">I&apos;m goin&apos;</span>
            <span className="block text-[13px] text-muted">Mark it now, change it any time.</span>
          </span>
          <input type="checkbox" checked={going} onChange={(e) => setGoing(e.target.checked)} className="size-5 accent-ink" />
        </label>
        <label className="flex items-center justify-between gap-3 text-[15px]">
          <span>
            <span className="font-semibold">List it in Explore</span>
            <span className="block text-[13px] text-muted">Private by default. Listing lets people nearby find it.</span>
          </span>
          <input type="checkbox" checked={listed} onChange={(e) => setListed(e.target.checked)} className="size-5 accent-ink" />
        </label>
      </div>

      <p className="mt-4 text-[13px] text-muted">Reminder the evening before and 2 hours before. Change it in Settings.</p>
      {signedIn === false ? <p className="mt-2 text-[13px] text-ink-2">You&apos;ll sign in when you tap Hum it. Your draft is kept.</p> : null}
      {error ? (
        <p role="alert" className="mt-3 rounded-tile border border-warn-line bg-warn px-3 py-2 text-[14px] text-warn-ink">
          {error}
        </p>
      ) : null}

      {dup ? (
        <div role="alertdialog" aria-labelledby="dup-title" className="mt-4 flex flex-col gap-3 rounded-card border border-line-strong bg-surface p-4">
          <p id="dup-title" className="text-[15px] font-semibold">Looks like you already saved this</p>
          <p className="text-[14px] text-ink-2">&ldquo;{dup.title}&rdquo; is in your hum around the same time.</p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/e/${dup.id}`} onClick={clearDraftBundle} className={buttonClasses({ variant: "secondary" })}>
              Open existing
            </Link>
            <button type="button" onClick={() => submit(true)} className={buttonClasses()}>
              Keep both
            </button>
          </div>
        </div>
      ) : null}

      <div className="h-[calc(96px+env(safe-area-inset-bottom))]" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur lg:left-[248px]">
        <div className="mx-auto grid w-full max-w-[640px] grid-cols-[1fr_2fr] gap-3 px-5 lg:max-w-[720px]">
          <button type="button" onClick={onSkip} className={buttonClasses({ variant: "secondary", size: "lg" })}>
            {position ? "Skip" : "Retake"}
          </button>
          <button type="button" onClick={() => submit(false)} disabled={pending || signedIn === null} className={buttonClasses({ size: "lg" })}>
            {pending ? "Saving…" : "Hum it"} {!pending ? <LimeDot /> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
