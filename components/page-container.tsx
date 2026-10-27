import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: ReactNode;
  /** `wide` lets Explore use up to 1200px on desktop for list + map. */
  size?: "default" | "wide";
  className?: string;
};

/**
 * Content column: full width with 20px side padding on phones,
 * 640px centered on tablets, 720px (or 1200px wide) on desktop.
 */
export function PageContainer({ children, size = "default", className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[640px] px-5 pt-6 lg:pt-10",
        size === "wide" ? "lg:max-w-[1200px]" : "lg:max-w-[720px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
