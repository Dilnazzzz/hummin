/**
 * Runs once when the Node server starts. In production it applies any pending
 * database migrations from ./drizzle before the first request, so a deploy
 * never serves against an out-of-date schema. Set MIGRATE_ON_BOOT=0 to skip.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NODE_ENV !== "production" || process.env.MIGRATE_ON_BOOT === "0") return;

  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const { db } = await import("./lib/db");
  const started = Date.now();
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log(`[db] migrations up to date (${Date.now() - started}ms)`);
}
