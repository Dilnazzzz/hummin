import { cn } from "@/lib/utils";

export function Tag({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "lime" | "sage" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-chip px-[9px] py-[3px] text-xs font-semibold",
        tone === "lime" && "bg-lime text-ink",
        tone === "sage" && "bg-sage text-sage-ink",
        tone === "neutral" && "bg-sunken text-ink-2",
      )}
    >
      {children}
    </span>
  );
}
