"use client";

import { useEffect, useState } from "react";

export function Reading({ label = "Reading your flyer…" }: { label?: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 12000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-ink px-5 text-center text-paper" role="status" aria-live="polite">
      <div className="flex h-16 items-center gap-2" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className="hum-bar block h-16 w-3 rounded-full bg-lime" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="title-screen">{slow ? "Still working…" : label}</h1>
        <p className="text-[15px] text-paper/75">Finding the date, place, price and whether it repeats.</p>
      </div>
    </div>
  );
}
