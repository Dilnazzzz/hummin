import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "lime" | "secondary";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-chip font-semibold text-[15px] leading-none transition-colors select-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink-2",
  lime: "bg-lime text-ink hover:brightness-95",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-sunken",
};

const sizes: Record<Size, string> = {
  md: "min-h-12 px-5",
  lg: "min-h-[52px] px-6 text-base",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

/** A link styled as one of the DESIGN.md buttons. Use a real <button> for actions that are not navigation. */
export function ButtonLink({ variant, size, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link {...props} className={buttonClasses({ variant, size, className })}>
      {children}
    </Link>
  );
}

/** Small lime dot used after the label on "Hum it". */
export function LimeDot() {
  return <span aria-hidden="true" className="ml-0.5 inline-block size-2 rounded-full bg-lime" />;
}
