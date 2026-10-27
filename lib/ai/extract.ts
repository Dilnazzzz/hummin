import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { formatInTimeZone } from "date-fns-tz";
import { RRule } from "rrule";
import { db } from "../db";
import { captures } from "../db/schema";
import { env } from "../env";
import { importLink } from "./link-import";
import { PROMPT_VERSION, SYSTEM_PROMPT, contextText, type PromptContext } from "./prompt";
import { extractionSchema, localDateTime, type ExtractedEvent, type Extraction } from "./schema";

export type ImageInput = { data: Buffer; mediaType: "image/jpeg" | "image/png" | "image/webp" };

export type ExtractRequest = {
  userId: string | null;
  images: ImageInput[];
  imageKeys: string[];
  text?: string | null;
  url?: string | null;
  hint?: string | null;
  timezone: string;
  capturedAt: Date;
};

/** What the confirm screen edits. Local wall-clock strings, no Date objects. */
export type DraftEvent = {
  title: string;
  description: string | null;
  startLocal: string | null;
  endLocal: string | null;
  allDay: boolean;
  timezone: string;
  venueName: string | null;
  address: string | null;
  priceText: string | null;
  isFree: boolean | null;
  host: string | null;
  sourceUrl: string | null;
  category: ExtractedEvent["category"];
  rrule: string | null;
  repeatText: string | null;
  confidence: number;
  missingFields: string[];
};

export type ExtractResult = {
  captureId: string;
  source: "link" | "ai";
  model: string | null;
  events: DraftEvent[];
  warnings: string[];
};

export class ExtractError extends Error {
  constructor(
    message: string,
    public code: "no_api_key" | "instagram" | "nothing_found" | "model_failed" | "bad_link",
    public status = 422,
  ) {
    super(message);
  }
}

const CONFIDENCE_FLOOR = 0.6;
const MAX_TOKENS = 4096;

let client: Anthropic | null = null;
function anthropic() {
  if (!env.ANTHROPIC_API_KEY) throw new ExtractError("Add ANTHROPIC_API_KEY to .env.local to read flyers.", "no_api_key", 503);
  return (client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 30_000, maxRetries: 1 }));
}

type ModelRun = {
  extraction: Extraction;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
};

async function callModel(req: ExtractRequest, ctx: PromptContext, model: string, strong: boolean): Promise<ModelRun> {
  const content: Anthropic.ContentBlockParam[] = req.images.map((img) => ({
    type: "image",
    source: { type: "base64", media_type: img.mediaType, data: img.data.toString("base64") },
  }));
  if (req.text?.trim()) content.push({ type: "text", text: `Source text:\n${req.text.trim().slice(0, 20000)}` });
  content.push({ type: "text", text: contextText(ctx) });

  const started = Date.now();
  const response = await anthropic().messages.parse({
    model,
    max_tokens: MAX_TOKENS,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
    output_config: strong
      ? { format: zodOutputFormat(extractionSchema), effort: "medium" }
      : { format: zodOutputFormat(extractionSchema) },
    ...(strong ? { thinking: { type: "adaptive" as const } } : {}),
  });

  if (response.stop_reason === "refusal") throw new ExtractError("The model declined to read this.", "model_failed");
  if (!response.parsed_output) throw new ExtractError("The model returned something unreadable.", "model_failed");

  return {
    extraction: response.parsed_output,
    model,
    latencyMs: Date.now() - started,
    inputTokens: response.usage.input_tokens + (response.usage.cache_read_input_tokens ?? 0),
    outputTokens: response.usage.output_tokens,
  };
}

function validRRule(rule: string | null) {
  if (!rule) return null;
  try {
    RRule.fromString(rule.replace(/^RRULE:/i, ""));
    return rule.replace(/^RRULE:/i, "");
  } catch {
    return null;
  }
}

function needsRetry(ev: ExtractedEvent) {
  return ev.confidence < CONFIDENCE_FLOOR || (ev.start_local != null && !localDateTime.test(ev.start_local));
}

function toDraft(ev: ExtractedEvent, fallbackTz: string): DraftEvent {
  const startOk = ev.start_local != null && localDateTime.test(ev.start_local);
  const endOk = ev.end_local != null && localDateTime.test(ev.end_local);
  const missing = new Set(ev.missing_fields);
  if (!startOk) missing.add("start_local");
  const rrule = validRRule(ev.rrule);
  const isFree = ev.is_free ?? (ev.price_text ? /free|\$0\b/i.test(ev.price_text) : null);
  return {
    title: ev.title.trim(),
    description: ev.description?.trim() || null,
    startLocal: startOk ? ev.start_local : null,
    endLocal: endOk ? ev.end_local : null,
    allDay: ev.all_day,
    timezone: ev.timezone || fallbackTz,
    venueName: ev.venue_name?.trim() || null,
    address: ev.address?.trim() || null,
    priceText: ev.price_text?.trim() || null,
    isFree,
    host: ev.host?.trim() || null,
    sourceUrl: ev.source_url?.trim() || null,
    category: ev.category,
    rrule,
    repeatText: rrule ? ev.repeat_text?.trim() || null : null,
    confidence: Math.max(0, Math.min(1, ev.confidence)),
    missingFields: [...missing],
  };
}

async function logCapture(req: ExtractRequest, data: Partial<typeof captures.$inferInsert>) {
  const [row] = await db
    .insert(captures)
    .values({
      userId: req.userId,
      imageKey: req.imageKeys[0] ?? null,
      rawText: req.text?.slice(0, 20000) ?? null,
      sourceUrl: req.url ?? null,
      promptVersion: PROMPT_VERSION,
      ...data,
    })
    .returning({ id: captures.id });
  return row.id;
}

/** Full pipeline: link import → fast model → strong retry → normalized drafts, logged to `captures`. */
export async function extractEvents(req: ExtractRequest): Promise<ExtractResult> {
  const warnings: string[] = [];
  const ctx: PromptContext = {
    capturedAt: req.capturedAt.toISOString(),
    userTimezone: req.timezone,
    today: formatInTimeZone(new Date(), req.timezone, "yyyy-MM-dd"),
    hint: req.hint ?? null,
  };

  // 1. Links: structured data first, no guessing.
  if (req.url) {
    const imported = await importLink(req.url, req.timezone);
    if (imported.kind === "instagram") {
      throw new ExtractError("Instagram requires a login. Screenshot the post instead.", "instagram");
    }
    if (imported.kind === "error") {
      throw new ExtractError(`Couldn't open that link (${imported.message}). Paste the text instead.`, "bad_link");
    }
    if (imported.kind === "events") {
      const events = imported.events.map((e) => toDraft(e, req.timezone));
      const captureId = await logCapture(req, { extracted: { events }, model: "jsonld" });
      return { captureId, source: "link", model: null, events, warnings };
    }
    req = { ...req, text: [req.text, `Page: ${imported.title ?? req.url}\n${imported.pageText}`].filter(Boolean).join("\n\n") };
  }

  if (req.images.length === 0 && !req.text?.trim()) {
    throw new ExtractError("Add a photo, a screenshot, a link or some text.", "nothing_found", 400);
  }

  // 2. Fast model, then 3. strong retry on low confidence or broken dates.
  let run: ModelRun;
  try {
    run = await callModel(req, ctx, env.AI_MODEL_FAST, false);
    if (run.extraction.events.length === 0 || run.extraction.events.some(needsRetry)) {
      try {
        const strong = await callModel(req, ctx, env.AI_MODEL_STRONG, true);
        if (strong.extraction.events.length >= run.extraction.events.length) {
          run = { ...strong, inputTokens: strong.inputTokens + run.inputTokens, outputTokens: strong.outputTokens + run.outputTokens };
        }
      } catch (e) {
        warnings.push("Second pass failed; showing the first read.");
        console.warn("[extract] strong retry failed:", (e as Error).message);
      }
    }
  } catch (e) {
    await logCapture(req, { error: (e as Error).message, model: env.AI_MODEL_FAST });
    if (e instanceof ExtractError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new ExtractError("The Anthropic API key was rejected.", "no_api_key", 503);
    if (e instanceof Anthropic.RateLimitError) throw new ExtractError("The reader is busy. Try again in a minute.", "model_failed", 429);
    throw new ExtractError("Couldn't read that one. Try a clearer photo or type it in.", "model_failed");
  }

  const events = run.extraction.events.map((e) => toDraft(e, req.timezone));
  const captureId = await logCapture(req, {
    extracted: { events, raw: run.extraction },
    model: run.model,
    latencyMs: run.latencyMs,
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
  });

  if (events.length === 0) {
    throw new ExtractError("No event found in that. Try a clearer photo or type it in.", "nothing_found");
  }
  return { captureId, source: "ai", model: run.model, events, warnings };
}
