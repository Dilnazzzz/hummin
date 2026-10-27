import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Camera } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";
import { ConnectedNavItems, ConnectedSettingsLink, NavItems, SettingsLink } from "./nav";

type AppShellProps = {
  children: ReactNode;
  /**
   * Bottom nav is hidden on capture, reading and confirm screens (< 1024px).
   * The desktop sidebar always shows.
   */
  bottomNav?: boolean;
};

/**
 * One shell for every signed-in screen. Pages never render nav themselves.
 * < 1024px: fixed bottom nav (Your hum · Catch · Explore), 88px + safe area.
 * ≥ 1024px: fixed 248px left sidebar; content centered in the remaining space.
 */
export function AppShell({ children, bottomNav = true }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-paper">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <Link href="/hum" className="mx-3 inline-flex w-fit rounded-md" aria-label="Hummin' home">
          <Logo size={30} />
        </Link>

        <div className="mt-8">
          <Suspense fallback={<NavItems variant="sidebar" pathname={null} />}>
            <ConnectedNavItems variant="sidebar" />
          </Suspense>
        </div>

        <Link href="/catch" className={cn(buttonClasses({ variant: "lime", size: "lg" }), "mt-5 w-full")}>
          <Camera size={20} strokeWidth={2} aria-hidden="true" />
          Catch an event
        </Link>

        <div className="mt-auto">
          <Suspense fallback={<SettingsLink pathname={null} />}>
            <ConnectedSettingsLink />
          </Suspense>
        </div>
      </aside>

      <main
        className={cn(
          "min-h-dvh lg:pl-[248px]",
          bottomNav ? "pb-[calc(88px+env(safe-area-inset-bottom)+16px)] lg:pb-0" : "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        {children}
      </main>

      {bottomNav ? (
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <Suspense fallback={<NavItems variant="bottom" pathname={null} />}>
            <ConnectedNavItems variant="bottom" />
          </Suspense>
        </nav>
      ) : null}
    </div>
  );
}
