import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

/** Public pages: landing and legal. No app nav. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between px-5 py-5">
        <Link href="/" aria-label="Hummin' home" className="rounded-md">
          <Logo size={30} />
        </Link>
        <nav aria-label="Marketing" className="flex items-center gap-2 text-sm font-medium">
          <Link href="/explore" className="rounded-chip px-3 py-2 text-ink-2 hover:bg-sunken">
            Explore
          </Link>
          <Link href="/login" className="rounded-chip bg-ink px-4 py-2 text-paper hover:bg-ink-2">
            Sign in
          </Link>
        </nav>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-muted">
        <p>© Hummin&apos;. We never sell your data.</p>
        <nav aria-label="Legal" className="flex gap-4">
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
        </nav>
      </footer>
    </div>
  );
}
