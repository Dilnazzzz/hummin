import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { connection } from "next/server";
import { db } from "@/lib/db";

/** Railway health check: 200 when the app is up and the database answers. */
export async function GET() {
  // Opt out of build-time prerendering; this must run on every request.
  await connection();
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[health] database check failed:", (e as Error).message);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
