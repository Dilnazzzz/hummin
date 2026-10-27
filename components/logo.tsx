import { cn } from "@/lib/utils";

type SignalMarkProps = {
  /** Height in px; width follows the 34:40 mark ratio. */
  size?: number;
  className?: string;
};

/** The signal mark: a dot plus two arcs. Stands in for the apostrophe in "hummin'". */
function SignalMark({ size = 20, className }: SignalMarkProps) {
  return (
    <svg
      viewBox="0 0 34 40"
      width={(size * 34) / 40}
      height={size}
      aria-hidden="true"
      className={cn("inline-block shrink-0", className)}
    >
      <circle cx="6" cy="22" r="5" fill="currentColor" />
      <path
        d="M14 12a14 14 0 0 1 0 20"
        stroke="currentColor"
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M22 5a24 24 0 0 1 0 34"
        stroke="currentColor"
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

type LogoProps = {
  /** Wordmark font size in px. The mark scales with it. */
  size?: number;
  /** Any CSS color; defaults to the current text color (ink). */
  color?: string;
  className?: string;
};

/** Wordmark "hummin" in Instrument Serif italic followed by the signal mark. */
export function Logo({ size = 28, color = "currentColor", className }: LogoProps) {
  return (
    <span
      className={cn("inline-flex items-baseline font-serif italic leading-none", className)}
      style={{ fontSize: size, color }}
      aria-label="Hummin'"
      role="img"
    >
      <span aria-hidden="true">hummin</span>
      <SignalMark size={size * 0.62} className="ml-[0.06em] translate-y-[-0.28em]" />
    </span>
  );
}
