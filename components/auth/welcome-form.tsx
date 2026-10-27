"use client";

import { MapPin } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { completeOnboarding, lookupArea } from "@/app/(auth)/welcome/actions";
import { buttonClasses } from "@/components/ui/button-link";

const INTERESTS: { value: string; label: string; cls: string }[] = [
  { value: "wellness", label: "Wellness", cls: "peer-checked:bg-ink peer-checked:text-paper bg-cat-wellness text-cat-wellness-ink" },
  { value: "food", label: "Food and drink", cls: "peer-checked:bg-ink peer-checked:text-paper bg-cat-food text-cat-food-ink" },
  { value: "art", label: "Art and making", cls: "peer-checked:bg-ink peer-checked:text-paper bg-cat-art text-cat-art-ink" },
  { value: "music", label: "Music", cls: "peer-checked:bg-ink peer-checked:text-paper bg-cat-music text-cat-music-ink" },
  { value: "community", label: "Community", cls: "peer-checked:bg-ink peer-checked:text-paper bg-cat-community text-cat-community-ink" },
  { value: "fitness", label: "Fitness", cls: "peer-checked:bg-ink peer-checked:text-paper bg-cat-fitness text-cat-fitness-ink" },
  { value: "learning", label: "Learning", cls: "peer-checked:bg-ink peer-checked:text-paper bg-cat-learning text-cat-learning-ink" },
];

type Props = {
  next: string;
  initial: { area: string | null; interests: string[] };
};

export function WelcomeForm({ next, initial }: Props) {
  const [area, setArea] = useState(initial.area ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const tzRef = useRef<HTMLInputElement>(null);
  const [locating, startLocating] = useTransition();
  const [locError, setLocError] = useState<string | null>(null);

  function stampTimezone() {
    try {
      if (tzRef.current) tzRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
    } catch {}
  }

  function useMyLocation() {
    setLocError(null);
    if (!("geolocation" in navigator)) {
      setLocError("Location isn't available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        startLocating(async () => {
          const name = await lookupArea(lat, lng);
          if (name) setArea(name);
          else setLocError("Found you, but couldn't name the area. Type it in.");
        });
      },
      () => setLocError("Couldn't get your location. Type your area instead."),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  }

  return (
    <form action={completeOnboarding} onSubmit={stampTimezone} className="flex flex-col gap-6">
      <input type="hidden" name="next" value={next} />
      <input ref={tzRef} type="hidden" name="timezone" defaultValue="America/Los_Angeles" />
      {coords ? (
        <>
          <input type="hidden" name="lat" value={coords.lat} />
          <input type="hidden" name="lng" value={coords.lng} />
        </>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="area" className="label-caps text-muted">
          Your area
        </label>
        <div className="flex gap-2">
          <input
            id="area"
            name="area"
            type="text"
            placeholder="Menlo Park"
            autoComplete="address-level2"
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setCoords(null);
            }}
            className="min-h-12 min-w-0 flex-1 rounded-tile border border-line bg-paper px-4 text-base placeholder:text-faint"
          />
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            aria-label="Use my location"
            className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink disabled:opacity-50"
          >
            <MapPin size={20} strokeWidth={1.8} aria-hidden="true" className={locating ? "animate-pulse" : ""} />
          </button>
        </div>
        {locError ? <p className="text-[13px] text-warn-ink">{locError}</p> : null}
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="label-caps mb-3 text-muted">What are you into? Pick a few</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(({ value, label, cls }) => (
            <label key={value} className="cursor-pointer">
              <input
                type="checkbox"
                name="interests"
                value={value}
                defaultChecked={initial.interests.includes(value)}
                className="peer sr-only"
              />
              <span
                className={`inline-flex min-h-10 items-center rounded-chip px-4 text-sm font-semibold transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink ${cls}`}
              >
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <button type="submit" className={buttonClasses({ size: "lg", className: "w-full" })}>
          Continue
        </button>
        <button type="submit" name="skip" value="1" className={buttonClasses({ variant: "secondary", className: "w-full" })}>
          Skip for now
        </button>
      </div>
    </form>
  );
}
