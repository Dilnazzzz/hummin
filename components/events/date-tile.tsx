import type { Category } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { CATEGORY_TINT } from "./category";

export function DateTile({ day, time, category, className }: { day: string; time: string; category: Category; className?: string }) {
  return (
    <div
      className={cn(
        "flex size-[58px] shrink-0 flex-col items-center justify-center rounded-tile leading-none",
        CATEGORY_TINT[category],
        className,
      )}
      aria-hidden="true"
    >
      <span className="text-[11px] font-semibold tracking-[0.08em]">{day}</span>
      <span className={cn("mt-1 font-semibold", time.length > 5 ? "text-[13px]" : "text-[15px]")}>{time}</span>
    </div>
  );
}
