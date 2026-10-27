import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../env";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { __humminPool?: Pool };

const pool =
  globalForDb.__humminPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
  });

if (env.NODE_ENV !== "production") globalForDb.__humminPool = pool;

export const db: Db = drizzle(pool, { schema });
