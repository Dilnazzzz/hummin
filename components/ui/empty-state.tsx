import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dashed empty state: title, one helpful sentence, optional actions. */
export function EmptyState({ title, body, children, className }: { title: string; body: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-start gap-4 rounded-card border border-dashed border-line-strong p-6", className)}>
      <div>
        <p className="text-base font-semibold">{title}</p>
        <p className="mt-1 text-[15px] text-muted">{body}</p>
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
