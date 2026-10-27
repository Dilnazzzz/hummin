import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// drizzle-kit does not load .env.local on its own.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});
