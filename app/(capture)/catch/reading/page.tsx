import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Reading your flyer…" };

// TODO(phase 5): drive from extraction state; "Still working…" at 12s; failure state with Enter manually.

export default function ReadingPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-ink px-5 text-center text-paper">
      <div className="flex h-16 items-center gap-2" role="img" aria-label="Reading">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="hum-bar block h-16 w-3 rounded-full bg-lime"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="title-screen">Reading your flyer…</h1>
        <p className="text-[15px] text-paper/75">Finding the date, place, price and whether it repeats.</p>
      </div>
      <Link
        href="/catch/confirm"
        className="rounded-chip border border-paper/30 px-5 py-3 text-sm font-semibold text-paper hover:bg-paper/10"
      >
        Skip ahead to the confirm screen
      </Link>
    </div>
  );
}
