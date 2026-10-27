import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PlaceholderProps = {
  /** Screen title, set in Instrument Serif italic. */
  title: string;
  /** Small-caps line above the title, e.g. the route. */
  eyebrow?: string;
  /** One sentence on what this screen is for. */
  purpose: string;
  /** Build phase from SPEC.md that fills this screen in. */
  phase: number;
  /** What the finished screen will contain. */
  items?: string[];
  children?: ReactNode;
  className?: string;
};

/** Consistent Phase 1 placeholder: title, purpose, phase chip and the planned contents. */
export function Placeholder({ title, eyebrow, purpose, phase, items, children, className }: PlaceholderProps) {
  return (
    <section className={cn("flex flex-col gap-6", className)}>
      <header className="flex flex-col gap-3">
        {eyebrow ? <p className="label-caps text-muted">{eyebrow}</p> : null}
        <h1 className="title-screen">{title}</h1>
        <p className="max-w-prose text-[15px] text-ink-2">{purpose}</p>
        <PhaseChip phase={phase} />
      </header>

      {items && items.length > 0 ? (
        <div className="rounded-card border border-dashed border-line-strong p-5">
          <p className="label-caps mb-3 text-muted">Planned for this screen</p>
          <ul className="flex flex-col gap-2 text-[15px] text-ink-2">
            {items.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-line-strong" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {children}
    </section>
  );
}

export function PhaseChip({ phase }: { phase: number }) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-chip bg-sunken px-3 py-1.5 text-xs font-semibold text-ink-2">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-lime ring-1 ring-ink/10" />
      Coming in phase {phase}
    </span>
  );
}

/** Dashed empty state from DESIGN.md. */
export function EmptyState({
  title,
  body,
  children,
  className,
}: {
  title: string;
  body: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-4 rounded-card border border-dashed border-line-strong p-6",
        className,
      )}
    >
      <div>
        <p className="text-base font-semibold">{title}</p>
        <p className="mt-1 text-[15px] text-muted">{body}</p>
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
