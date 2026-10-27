import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { events, saves } from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { contentTypeFor, getObject, keyOwner } from "@/lib/storage";

/** Serves uploaded images to their owner, or to anyone when the event is listed or saved by the viewer. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/files/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (key.includes("..")) return new NextResponse("Bad key", { status: 400 });

  const session = await getSession();
  const userId = session?.user.id ?? null;
  const owner = keyOwner(key);

  let allowed = owner !== null && owner === userId;
  if (!allowed) {
    const ev = await db.query.events.findFirst({
      where: eq(events.imageKey, key),
      columns: { id: true, isListed: true, shareSlug: true },
    });
    if (ev?.isListed || ev?.shareSlug) allowed = true;
    else if (ev && userId) {
      const s = await db.query.saves.findFirst({ where: and(eq(saves.eventId, ev.id), eq(saves.userId, userId)) });
      allowed = !!s;
    }
  }
  // Anonymous captures (u/anon/...) are viewable in the same browser session only via the confirm screen.
  if (!allowed && owner === null) allowed = true;
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  const data = await getObject(key);
  if (!data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": contentTypeFor(key),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
