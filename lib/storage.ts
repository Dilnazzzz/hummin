import { createId } from "@paralleldrive/cuid2";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";

/**
 * Object storage behind a tiny interface. Local disk in development;
 * swap the three functions for R2 (S3 SDK) without touching callers.
 * Keys look like `u/<userId>/<id>.jpg`; `anon` for signed-out captures.
 */
const root = path.resolve(/* turbopackIgnore: true */ process.cwd(), env.UPLOAD_DIR);

function resolveSafe(key: string) {
  const p = path.resolve(/* turbopackIgnore: true */ root, key);
  if (!p.startsWith(root + path.sep)) throw new Error("Invalid storage key");
  return p;
}

export function newImageKey(userId: string | null, ext = "jpg") {
  return `u/${userId ?? "anon"}/${createId()}.${ext}`;
}

export function keyOwner(key: string): string | null {
  const m = /^u\/([^/]+)\//.exec(key);
  return m && m[1] !== "anon" ? m[1] : null;
}

export async function putObject(key: string, data: Buffer) {
  const p = resolveSafe(key);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, data);
  return key;
}

export async function getObject(key: string): Promise<Buffer | null> {
  try {
    return await readFile(resolveSafe(key));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export function contentTypeFor(key: string) {
  const ext = path.extname(key).toLowerCase();
  return ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
}
