"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

export function Toast({ message, duration = 2600 }: { message: string; duration?: number }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOpen(false), duration);
    return () => clearTimeout(t);
  }, [duration]);
  if (!open) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-50 flex justify-center px-5">
      <div className="flex items-center gap-3 rounded-chip bg-ink px-4 py-3 text-[15px] font-medium text-paper shadow-lg">
        <span className="flex size-6 items-center justify-center rounded-full bg-lime text-ink">
          <Check size={14} strokeWidth={3} aria-hidden="true" />
        </span>
        {message}
      </div>
    </div>
  );
}
