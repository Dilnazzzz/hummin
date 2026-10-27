import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { ExtractError, extractEvents, type ImageInput } from "@/lib/ai/extract";
import { checkExtractionLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { newImageKey, putObject } from "@/lib/storage";

export const maxDuration = 60;

const MAX_IMAGES = 10;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

const fields = z.object({
  text: z.string().max(20000).optional(),
  url: z.string().max(2048).optional(),
  hint: z.string().max(500).optional(),
  timezone: z.string().min(1).max(64).default("America/Los_Angeles"),
  capturedAt: z.coerce.date().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  const userId = session?.user.id ?? null;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  const limit = await checkExtractionLimit(userId, ip);
  if (!limit.ok) {
    return NextResponse.json(
      { error: userId ? "Daily reading limit reached. Try again tomorrow." : "Sign in to keep reading flyers." },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const parsed = fields.safeParse({
    text: form.get("text") || undefined,
    url: form.get("url") || undefined,
    hint: form.get("hint") || undefined,
    timezone: form.get("timezone") || undefined,
    capturedAt: form.get("capturedAt") || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid fields." }, { status: 400 });

  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_IMAGES) return NextResponse.json({ error: `Up to ${MAX_IMAGES} images at once.` }, { status: 400 });

  const images: ImageInput[] = [];
  const imageKeys: string[] = [];
  for (const file of files) {
    if (file.size > MAX_BYTES) return NextResponse.json({ error: `${file.name} is over 8MB.` }, { status: 413 });
    if (file.type && !ACCEPTED.has(file.type)) {
      return NextResponse.json({ error: `${file.name}: use JPEG, PNG, WebP or HEIC.` }, { status: 415 });
    }
    try {
      // Resize to max 1500px, strip metadata (including GPS), normalize to JPEG.
      const jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize({ width: 1500, height: 1500, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toBuffer();
      const key = newImageKey(userId);
      await putObject(key, jpeg);
      images.push({ data: jpeg, mediaType: "image/jpeg" });
      imageKeys.push(key);
    } catch (e) {
      console.warn("[extract] image failed:", (e as Error).message);
      return NextResponse.json({ error: `Couldn't read ${file.name}. Try a JPEG or PNG.` }, { status: 415 });
    }
  }

  try {
    const result = await extractEvents({
      userId,
      images,
      imageKeys,
      text: parsed.data.text ?? null,
      url: parsed.data.url ?? null,
      hint: parsed.data.hint ?? null,
      timezone: parsed.data.timezone,
      capturedAt: parsed.data.capturedAt ?? new Date(),
    });
    return NextResponse.json({ ...result, imageKeys, remaining: limit.remaining });
  } catch (e) {
    if (e instanceof ExtractError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    console.error("[extract]", e);
    return NextResponse.json({ error: "Something went wrong reading that." }, { status: 500 });
  }
}
