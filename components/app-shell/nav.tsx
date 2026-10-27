"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Compass, List, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavVariant = "sidebar" | "bottom";

const items = [
  { href: "/hum", label: "Your hum", Icon: List, match: ["/hum", "/e/"] },
  { href: "/explore", label: "Explore", Icon: Compass, match: ["/explore"] },
] as const;

function isActive(pathname: string | null, prefixes: readonly string[]) {
  if (!pathname) return false;
  return prefixes.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`));
}

/**
 * Presentational nav. `pathname` may be null during prerendering of routes
 * with unknown params (see ConnectedNavItems); then nothing is marked active.
 */
export function NavItems({ variant, pathname }: { variant: NavVariant; pathname: string | null }) {
  if (variant === "bottom") {
    const [hum, explore] = items;
    return (
      <div className="relative mx-auto grid h-[88px] max-w-[640px] grid-cols-3 items-stretch">
        <BottomItem {...hum} active={isActive(pathname, hum.match)} />
        <div className="relative flex justify-center">
          <Link
            href="/catch"
            aria-label="Catch an event"
            className="absolute -top-[26px] flex size-[60px] items-center justify-center rounded-full bg-lime text-ink ring-4 ring-paper transition-transform hover:scale-105 active:scale-95"
          >
            <Camera size={26} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
        <BottomItem {...explore} active={isActive(pathname, explore.match)} />
      </div>
    );
  }

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {items.map(({ href, label, Icon, match }) => {
        const active = isActive(pathname, match);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-tile px-3 text-[15px] font-medium transition-colors",
              active ? "bg-sunken text-ink" : "text-muted hover:bg-sunken/60 hover:text-ink",
            )}
          >
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function BottomItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: typeof List;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center justify-center gap-1 pt-1 text-[11px] font-semibold tracking-wide transition-colors",
        active ? "text-ink" : "text-faint hover:text-ink-2",
      )}
    >
      <Icon size={24} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
      {label}
    </Link>
  );
}

export function SettingsLink({ pathname }: { pathname: string | null }) {
  const active = isActive(pathname, ["/settings"]);
  return (
    <Link
      href="/settings"
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-tile px-3 text-[15px] font-medium transition-colors",
        active ? "bg-sunken text-ink" : "text-muted hover:bg-sunken/60 hover:text-ink",
      )}
    >
      <Settings size={20} strokeWidth={1.8} aria-hidden="true" />
      Settings
    </Link>
  );
}

/** Reads the pathname to mark the active item. Must sit inside a <Suspense> (Cache Components). */
export function ConnectedNavItems({ variant }: { variant: NavVariant }) {
  const pathname = usePathname();
  return <NavItems variant={variant} pathname={pathname} />;
}

export function ConnectedSettingsLink() {
  const pathname = usePathname();
  return <SettingsLink pathname={pathname} />;
}
