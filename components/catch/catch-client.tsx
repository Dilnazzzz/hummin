"use client";

import { Camera, ClipboardPaste, ImagePlus, Link as LinkIcon, Type, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import type { DraftEvent } from "@/lib/ai/extract";
import { cn } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button-link";
import { Reading } from "./reading";
import { emptyDraft, saveDraftBundle } from "./draft-store";

type Mode = "photo" | "paste";
type Picked = { file: File; url: string };

const MAX_FILES = 10;
const MAX_BYTES = 8 * 1024 * 1024;

function isHeic(file: File) {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

async function normalizeFile(file: File): Promise<File> {
  if (!isHeic(file)) return file;
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(out) ? out[0] : out;
  return new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg", lastModified: file.lastModified });
}

export function CatchClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("photo");
  const [picked, setPicked] = useState<Picked[]>([]);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "reading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraUsed = useRef(false);

  const addFiles = useCallback((list: FileList | File[]) => {
    setError(null);
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/") || isHeic(f));
    if (!incoming.length) {
      setError("That doesn't look like an image.");
      return;
    }
    setPicked((prev) => {
      const next = [...prev];
      for (const f of incoming) {
        if (next.length >= MAX_FILES) break;
        if (f.size > MAX_BYTES) {
          setError(`${f.name} is over 8MB.`);
          continue;
        }
        next.push({ file: f, url: isHeic(f) ? "" : URL.createObjectURL(f) });
      }
      return next;
    });
    setMode("photo");
  }, []);

  useEffect(() => {
    // Paste an image from the clipboard anywhere on the page.
    function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [addFiles]);

  useEffect(() => () => picked.forEach((p) => p.url && URL.revokeObjectURL(p.url)), [picked]);

  function remove(i: number) {
    setPicked((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  const looksLikeUrl = /^https?:\/\/\S+$/i.test(text.trim()) || /^https?:\/\/\S+$/i.test(url.trim());
  const canRead = picked.length > 0 || text.trim().length > 0 || url.trim().length > 0;

  async function read() {
    if (!canRead) return;
    setStatus("reading");
    setError(null);
    try {
      const form = new FormData();
      const files = await Promise.all(picked.map((p) => normalizeFile(p.file)));
      for (const f of files) form.append("images", f, f.name);
      const trimmedText = text.trim();
      const trimmedUrl = url.trim() || (/^https?:\/\/\S+$/i.test(trimmedText) ? trimmedText : "");
      if (trimmedUrl) form.set("url", trimmedUrl);
      else if (trimmedText) form.set("text", trimmedText);
      form.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles");
      const earliest = files.reduce((min, f) => Math.min(min, f.lastModified || Date.now()), Date.now());
      form.set("capturedAt", new Date(earliest).toISOString());

      const res = await fetch("/api/extract", { method: "POST", body: form });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        events?: DraftEvent[];
        imageKeys?: string[];
        captureId?: string;
        source?: "ai" | "link";
      };
      if (!res.ok || !data.events) {
        setStatus("error");
        setError(data.error ?? "Couldn't read that one. Try a clearer photo or type it in.");
        return;
      }
      saveDraftBundle({
        events: data.events,
        imageKeys: data.imageKeys ?? [],
        captureId: data.captureId ?? null,
        source: data.source ?? "ai",
        sourceType: files.length ? (mode === "photo" && cameraUsed.current ? "photo" : "upload") : trimmedUrl ? "link" : "text",
        createdAt: Date.now(),
      });
      router.push("/catch/confirm");
    } catch (e) {
      setStatus("error");
      setError((e as Error).message || "Something went wrong. Try again.");
    }
  }

  function enterManually() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles";
    saveDraftBundle({ events: [emptyDraft(tz)], imageKeys: [], captureId: null, source: "manual", sourceType: "text", createdAt: Date.now() });
    router.push("/catch/confirm");
  }

  if (status === "reading") return <Reading label={picked.length ? "Reading your flyer…" : looksLikeUrl ? "Opening that link…" : "Reading your text…"} />;

  return (
    <div className="mx-auto w-full max-w-[640px] px-5 pt-6 lg:max-w-[960px] lg:pt-10">
      <div className="flex items-center justify-between">
        <h1 className="title-screen">Catch an event</h1>
        <Link href="/hum" aria-label="Close" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink">
          <X size={20} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
      <p className="mt-3 text-[15px] text-ink-2">Works on flyers, posters, chalkboards and screens.</p>

      {error ? (
        <p role="alert" className="mt-4 rounded-tile border border-warn-line bg-warn px-3 py-2 text-[14px] text-warn-ink">
          {error}{" "}
          <button type="button" onClick={enterManually} className="font-semibold underline underline-offset-2">
            Enter it manually
          </button>
        </p>
      ) : null}

      {/* Mode switch */}
      <div role="tablist" aria-label="How to catch it" className="mt-5 flex gap-1 rounded-chip bg-sunken p-1">
        {(
          [
            ["photo", "Photo or screenshot", ImagePlus],
            ["paste", "Link or text", Type],
          ] as const
        ).map(([m, label, Icon]) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-chip text-sm font-semibold transition-colors",
              mode === m ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
            )}
          >
            <Icon size={16} strokeWidth={2} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Images */}
        <section className={cn(mode !== "photo" && "hidden lg:block")} aria-label="Photo or screenshot">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              cameraUsed.current = true;
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={libraryRef}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {picked.length === 0 ? (
            <>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex min-h-[220px] w-full flex-col items-center justify-center gap-3 rounded-panel bg-ink text-paper lg:hidden"
              >
                <span className="flex size-[60px] items-center justify-center rounded-full bg-lime text-ink">
                  <Camera size={26} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="text-base font-semibold">Take a photo</span>
                <span className="text-sm text-paper/70">Opens your camera</span>
              </button>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  "mt-3 flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-panel border-2 border-dashed bg-surface p-6 text-center transition-colors lg:mt-0 lg:min-h-[320px]",
                  dragOver ? "border-ink bg-sunken" : "border-line-strong",
                )}
              >
                <span className="hidden size-14 items-center justify-center rounded-full bg-lime text-ink lg:flex">
                  <Upload size={24} strokeWidth={2} aria-hidden="true" />
                </span>
                <p className="text-base font-semibold">
                  <span className="lg:hidden">Upload a screenshot</span>
                  <span className="hidden lg:inline">Drop a flyer or screenshot here</span>
                </p>
                <p className="text-sm text-muted">JPEG, PNG, HEIC or WebP · up to 8MB each · up to 10 at once · or paste from the clipboard</p>
                <button type="button" onClick={() => libraryRef.current?.click()} className={buttonClasses({ variant: "secondary" })}>
                  Choose from library
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <ul className="grid grid-cols-3 gap-2" aria-label="Selected images">
                {picked.map((p, i) => (
                  <li key={i} className="relative aspect-[3/4] overflow-hidden rounded-tile border border-line bg-sunken">
                    {p.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.url} alt="" className="size-full object-cover" />
                    ) : (
                      <span className="flex size-full items-center justify-center px-2 text-center text-xs text-muted">HEIC · converts on read</span>
                    )}
                    <span className="absolute left-1.5 top-1.5 rounded-chip bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-paper">{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      aria-label={`Remove image ${i + 1}`}
                      className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-surface text-ink"
                    >
                      <X size={14} strokeWidth={2.2} aria-hidden="true" />
                    </button>
                  </li>
                ))}
                {picked.length < MAX_FILES ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => libraryRef.current?.click()}
                      className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-1 rounded-tile border border-dashed border-line-strong text-xs font-semibold text-ink-2"
                    >
                      <ImagePlus size={20} strokeWidth={1.8} aria-hidden="true" />
                      Add more
                    </button>
                  </li>
                ) : null}
              </ul>
              <p className="text-[13px] text-muted">
                {picked.length} in batch · we read them together and find every event.
              </p>
              <button type="button" onClick={read} className={buttonClasses({ size: "lg" })}>
                Read {picked.length === 1 ? "it" : `${picked.length} images`}
              </button>
            </div>
          )}
        </section>

        {/* Link / text */}
        <section className={cn("flex flex-col gap-3 rounded-panel border border-line bg-surface p-5", mode !== "paste" && "hidden lg:flex")} aria-label="Link or text">
          <label htmlFor="url" className="label-caps inline-flex items-center gap-2 text-muted">
            <LinkIcon size={14} strokeWidth={2} aria-hidden="true" />
            Paste a link
          </label>
          <input
            id="url"
            type="url"
            inputMode="url"
            placeholder="https://lu.ma/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="min-h-12 w-full rounded-tile border border-line bg-paper px-4 text-base placeholder:text-faint"
          />
          {/instagram\.com/i.test(url) ? (
            <p className="rounded-tile bg-warn px-3 py-2 text-[13px] text-warn-ink">Instagram requires a login. Screenshot the post instead.</p>
          ) : url.trim() ? (
            <p className="text-[13px] text-muted">Luma, Eventbrite and Partiful links import exactly, no guessing. Registration still happens on their page.</p>
          ) : null}

          <label htmlFor="paste" className="label-caps mt-2 inline-flex items-center gap-2 text-muted">
            <ClipboardPaste size={14} strokeWidth={2} aria-hidden="true" />
            Or paste text
          </label>
          <textarea
            id="paste"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="A newsletter blurb, a caption, a group chat message…"
            className="min-h-[140px] w-full resize-y rounded-tile border border-line bg-paper p-4 text-base placeholder:text-faint"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={read} disabled={!canRead || picked.length > 0} className={buttonClasses({ size: "lg" })}>
              Read it
            </button>
            <button type="button" onClick={enterManually} className={buttonClasses({ variant: "secondary" })}>
              Type it in myself
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
