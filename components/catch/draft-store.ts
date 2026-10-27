import type { DraftEvent } from "@/lib/ai/extract";

export type DraftBundle = {
  events: DraftEvent[];
  imageKeys: string[];
  captureId: string | null;
  source: "ai" | "link" | "manual";
  sourceType: "photo" | "upload" | "link" | "text";
  createdAt: number;
};

const KEY = "hummin.draft";

export function saveDraftBundle(b: DraftBundle) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(b));
  } catch {}
}

function loadDraftBundle(): DraftBundle | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const b = JSON.parse(raw) as DraftBundle;
    // Drafts older than a day are stale.
    if (Date.now() - b.createdAt > 24 * 3600 * 1000) return null;
    return b;
  } catch {
    return null;
  }
}

// useSyncExternalStore helpers: stable snapshot per raw string.
let snapshot: { raw: string | null; value: DraftBundle | null } = { raw: null, value: null };
export function getDraftSnapshot(): DraftBundle | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
  } catch {}
  if (raw !== snapshot.raw) snapshot = { raw, value: raw ? loadDraftBundle() : null };
  return snapshot.value;
}
export function getDraftServerSnapshot(): DraftBundle | null | undefined {
  return undefined;
}
export function subscribeDraft(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function clearDraftBundle() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

export function emptyDraft(timezone: string): DraftEvent {
  return {
    title: "",
    description: null,
    startLocal: null,
    endLocal: null,
    allDay: false,
    timezone,
    venueName: null,
    address: null,
    priceText: null,
    isFree: null,
    host: null,
    sourceUrl: null,
    category: "community",
    rrule: null,
    repeatText: null,
    confidence: 1,
    missingFields: ["start_local", "address", "price_text"],
  };
}
