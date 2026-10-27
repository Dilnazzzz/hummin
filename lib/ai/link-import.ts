import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { ExtractedEvent } from "./schema";

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 8000;

export type LinkImport =
  | { kind: "instagram" }
  | { kind: "events"; events: ExtractedEvent[]; pageText: string; title: string | null }
  | { kind: "text"; pageText: string; title: string | null }
  | { kind: "error"; message: string };

function isPrivateIp(ip: string) {
  if (ip.includes(":")) return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80");
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/** SSRF guard: http(s) only, public hosts only. */
async function assertSafeUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http and https links are supported");
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Blocked host");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addrs.some((a) => isPrivateIp(a.address))) throw new Error("Blocked host");
  return url;
}

function isInstagram(raw: string) {
  try {
    const h = new URL(raw).hostname;
    return h === "instagram.com" || h.endsWith(".instagram.com");
  } catch {
    return false;
  }
}

async function fetchPage(url: URL): Promise<string> {
  const res = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Hummin/0.1; +https://hummin.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`Page returned ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    chunks.push(value);
    if (total > MAX_BYTES) {
      await reader.cancel();
      break;
    }
  }
  return Buffer.concat(chunks).toString("utf8");
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h\d|br|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, 20000);
}

type JsonLd = Record<string, unknown>;

function collectJsonLd(html: string): JsonLd[] {
  const out: JsonLd[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && typeof item === "object") {
          const graph = (item as JsonLd)["@graph"];
          if (Array.isArray(graph)) out.push(...(graph as JsonLd[]));
          else out.push(item as JsonLd);
        }
      }
    } catch {
      /* ignore malformed blocks */
    }
  }
  return out;
}

function isEventType(t: unknown) {
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => typeof x === "string" && /event$/i.test(x));
}

function str(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (v && typeof v === "object" && "name" in v) return str((v as JsonLd).name);
  return null;
}

/** "2026-11-01T18:00:00-07:00" → "2026-11-01T18:00" (local wall time as written). */
function localPart(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/.exec(v);
  if (!m) return null;
  return `${m[1]}T${m[2] ?? "00:00"}`;
}

function addressText(loc: unknown): { venue: string | null; address: string | null } {
  if (!loc || typeof loc !== "object") return { venue: str(loc), address: null };
  const l = loc as JsonLd;
  const venue = str(l.name);
  const a = l.address;
  let address: string | null = null;
  if (typeof a === "string") address = a;
  else if (a && typeof a === "object") {
    const o = a as JsonLd;
    address = [o.streetAddress, o.addressLocality, o.addressRegion, o.postalCode]
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean)
      .join(", ") || null;
  }
  return { venue, address };
}

function toEvent(ld: JsonLd, pageUrl: string, timezone: string): ExtractedEvent | null {
  const title = str(ld.name);
  const start = localPart(ld.startDate);
  if (!title) return null;
  const { venue, address } = addressText(ld.location);
  const offers = Array.isArray(ld.offers) ? (ld.offers[0] as JsonLd | undefined) : (ld.offers as JsonLd | undefined);
  const price = offers?.price != null ? String(offers.price) : null;
  const currency = typeof offers?.priceCurrency === "string" ? offers.priceCurrency : "";
  const priceText = price == null ? null : Number(price) === 0 ? "Free" : `${currency === "USD" ? "$" : currency ? `${currency} ` : ""}${price}`;
  const missing: string[] = [];
  if (!start) missing.push("start_local");
  if (!venue && !address) missing.push("address");
  if (priceText == null) missing.push("price_text");
  return {
    title,
    description: typeof ld.description === "string" ? stripHtml(ld.description).slice(0, 400) : null,
    start_local: start,
    end_local: localPart(ld.endDate),
    all_day: typeof ld.startDate === "string" && !ld.startDate.includes("T"),
    timezone,
    venue_name: venue,
    address,
    price_text: priceText,
    is_free: priceText == null ? null : priceText === "Free",
    host: str(ld.organizer),
    source_url: typeof ld.url === "string" ? ld.url : pageUrl,
    category: "community",
    rrule: null,
    repeat_text: null,
    confidence: start ? 0.95 : 0.5,
    missing_fields: missing,
  };
}

/**
 * Link import: structured data first (Luma, Eventbrite, Partiful and any
 * schema.org Event page), otherwise the page text for the model.
 */
export async function importLink(raw: string, timezone: string): Promise<LinkImport> {
  if (isInstagram(raw)) return { kind: "instagram" };
  try {
    const url = await assertSafeUrl(raw);
    const html = await fetchPage(url);
    const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? null;
    const events = collectJsonLd(html)
      .filter((ld) => isEventType(ld["@type"]))
      .map((ld) => toEvent(ld, url.toString(), timezone))
      .filter((e): e is ExtractedEvent => !!e);
    const pageText = stripHtml(html);
    if (events.length) return { kind: "events", events, pageText, title };
    return { kind: "text", pageText, title };
  } catch (e) {
    return { kind: "error", message: (e as Error).message };
  }
}
