import { and, count, eq, gte } from "drizzle-orm";
import { db } from "./db";
import { captures } from "./db/schema";
import { env } from "./env";

const anonBuckets = new Map<string, { day: string; n: number }>();
const ANON_DAILY = 5;

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Per-user daily extraction limit from the captures log; signed-out visitors get a small in-memory allowance by IP. */
export async function checkExtractionLimit(userId: string | null, ip: string): Promise<{ ok: boolean; remaining: number }> {
  if (!userId) {
    const b = anonBuckets.get(ip);
    const n = b && b.day === today() ? b.n : 0;
    if (n >= ANON_DAILY) return { ok: false, remaining: 0 };
    anonBuckets.set(ip, { day: today(), n: n + 1 });
    return { ok: true, remaining: ANON_DAILY - n - 1 };
  }
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const [{ n }] = await db
    .select({ n: count() })
    .from(captures)
    .where(and(eq(captures.userId, userId), gte(captures.createdAt, since)));
  const used = Number(n);
  return { ok: used < env.AI_DAILY_LIMIT_PER_USER, remaining: Math.max(0, env.AI_DAILY_LIMIT_PER_USER - used) };
}
