import { z } from "zod";

/** Treat empty strings from .env files as "not set". */
const opt = () => z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  BETTER_AUTH_SECRET: z.string().min(16, "BETTER_AUTH_SECRET must be at least 16 chars"),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: opt(),
  GOOGLE_CLIENT_SECRET: opt(),

  ANTHROPIC_API_KEY: opt(),
  AI_MODEL_FAST: z.string().default("claude-haiku-4-5"),
  AI_MODEL_STRONG: z.string().default("claude-sonnet-5"),
  AI_DAILY_LIMIT_PER_USER: z.coerce.number().int().positive().default(30),

  RESEND_API_KEY: opt(),
  EMAIL_FROM: z.string().default("Hummin' <hello@hummin.app>"),

  UPLOAD_DIR: z.string().default("./.uploads"),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

/** Server-only. Never import from a Client Component. */
export const env = load();

