# Hummin' — Infrastructure, Auth, Data and AI

> Companion to SPEC.md, DESIGN.md, SCREENS.md. This is the "how it actually runs" doc: accounts, deployment, database, authentication, user data, AI, email, storage, security. Check each provider's current docs and pricing when you set it up; versions and prices change.

---

## 0. Accounts to create (use personal email, personal card, personal laptop)
| Service | For | Notes |
|---|---|---|
| GitHub | Code | Private repo `hummin` |
| Railway | App hosting, Postgres, cron | Connect GitHub |
| Cloudflare | R2 storage + DNS for your domain | R2 needs a card even on the free tier |
| Domain registrar | `hummin.app` or similar | Point DNS to Cloudflare |
| Google Cloud Console | Google sign-in (OAuth client) | Free |
| Anthropic Console | Claude API key | Set a monthly spend limit |
| Resend | Magic-link and reminder emails | Verify your domain |
| PostHog | Product analytics | Free tier |
| Sentry | Error tracking | Free tier |
| Stripe | Host payments (later) | Not needed for launch |

---

## 1. Environments
| | Local | Production |
|---|---|---|
| URL | http://localhost:3000 | https://hummin.app |
| Database | Railway Postgres "dev" (or local Docker Postgres) | Railway Postgres "prod" |
| R2 bucket | `hummin-dev` | `hummin-prod` |
| Google OAuth redirect | `http://localhost:3000/api/auth/callback/google` | `https://hummin.app/api/auth/callback/google` |
| Emails | Resend test mode / your own address only | Verified domain |
| Env file | `.env.local` (git-ignored) | Railway Variables |

Commit a `.env.example` with every variable name and no values. Never commit secrets.

### Full env var list
```
# App
APP_URL=                     # http://localhost:3000 or https://hummin.app
NODE_ENV=

# Database
DATABASE_URL=                # from Railway Postgres

# Auth (Better Auth)
BETTER_AUTH_SECRET=          # openssl rand -base64 32
BETTER_AUTH_URL=             # same as APP_URL
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_EMAILS=                # comma-separated, gets /admin

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=

# AI
ANTHROPIC_API_KEY=
AI_MODEL_FAST=claude-haiku-5-5
AI_MODEL_STRONG=claude-sonnet-5-5
AI_DAILY_LIMIT_PER_USER=30

# Email
RESEND_API_KEY=
EMAIL_FROM="Hummin' <hello@hummin.app>"

# Jobs
CRON_SECRET=                 # openssl rand -hex 32

# Monitoring / analytics
SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Later
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_MAP_TOKEN=
```
Validate env vars at startup with Zod (`lib/env.ts`) so a missing key fails loudly.

---

## 2. Project structure
```
app/
  (marketing)/page.tsx            landing
  (auth)/login/page.tsx
  (app)/layout.tsx                AppShell, requires session
  (app)/hum/ explore/ catch/ e/[id]/ me/ settings/
  (host)/host/...                 host dashboard (requires host role)
  h/[slug]/page.tsx               public host page
  admin/                          ADMIN_EMAILS only
  api/auth/[...all]/route.ts      Better Auth handler
  api/extract/route.ts            AI extraction
  api/upload/route.ts             presigned R2 URLs
  api/cron/reminders/route.ts     called by Railway cron
  api/calendar/[id]/route.ts      .ics download
lib/
  auth.ts  auth-client.ts  db/schema.ts  db/index.ts  env.ts
  ai/extract.ts  ai/prompt.ts  ai/schema.ts
  storage.ts  email/  dates.ts  rate-limit.ts
drizzle/                          generated migrations
proxy.ts                          route protection (named middleware.ts in older Next.js)
```

---

## 3. Deployment (Railway)
1. Push the repo to GitHub.
2. Railway → New project → Deploy from GitHub repo → select `hummin`.
3. Add a **Postgres** service in the same project. Reference its `DATABASE_URL` in the app service variables (`${{Postgres.DATABASE_URL}}`).
4. Add all production env vars in the app service → Variables.
5. Build command: `npm run build` · Start command: `npm run start` · Pre-deploy command: `npm run db:migrate` (runs Drizzle migrations before each release).
6. Settings → Networking → generate a Railway domain to test, then add your custom domain and create the CNAME in Cloudflare DNS.
7. **Cron service:** add a second service (same repo or a tiny script) with a cron schedule of `*/15 * * * *` that runs:
   `curl -fsS -X POST "$APP_URL/api/cron/reminders" -H "Authorization: Bearer $CRON_SECRET"`
8. Health check: `GET /api/health` returns 200 and checks the DB connection; set it as Railway's healthcheck path.
9. Every push to `main` deploys. Use a `dev` branch for work; merge to `main` when it's tested. Railway PR environments are optional later.

**Backups:** turn on Railway Postgres backups (check what your plan includes). Also run a weekly `pg_dump` to R2 from the cron service once you have real users.

---

## 4. Database (Postgres + Drizzle)
- Schema lives in `lib/db/schema.ts`. Tables: everything in SPEC.md "Data model" + the extras in SCREENS.md + Better Auth's tables.
- Scripts in `package.json`:
  - `db:generate` → `drizzle-kit generate` (creates a migration from schema changes)
  - `db:migrate` → `drizzle-kit migrate` (applies migrations)
  - `db:studio` → `drizzle-kit studio` (browse data locally)
- Workflow: change schema → `db:generate` → review the SQL → commit it → deploy (pre-deploy runs migrate). Never edit production tables by hand.
- IDs: `text` primary keys with `cuid2` or `uuid`.
- Times: always `timestamptz` stored in UTC + the event's IANA `timezone` column. Convert only when displaying.
- Indexes: `saves(user_id)`, `events(is_listed, start_at)`, `events(host_id)`, `reminders(send_at) where sent_at is null`, unique `events(share_slug)`, unique `hosts(slug)`.
- Seed script `npm run db:seed`: a few sample listed events for local dev and the demo.

---

## 5. Authentication (Better Auth)
**Methods:** Google sign-in and email magic link. No passwords.

### Setup
1. `npm i better-auth` and create `lib/auth.ts`:
   - database adapter: Drizzle (Postgres)
   - `socialProviders.google` with client ID/secret
   - `plugins: [magicLink({ sendMagicLink })]` where `sendMagicLink` sends a Resend email with the link (expires in 10–15 minutes)
   - `session`: cookie-based, ~30 days, refreshed when used
   - `account.accountLinking`: on, so the same email via Google and magic link becomes one user
2. Generate Better Auth's tables with its CLI and add them to the Drizzle schema (user, session, account, verification). Our `user_profiles` table references `user.id`.
3. Route handler: `app/api/auth/[...all]/route.ts` exports Better Auth's Next.js handler.
4. Client: `lib/auth-client.ts` with `createAuthClient()` + the magic-link client plugin; use `signIn.social({ provider: "google" })` and `signIn.magicLink({ email, callbackURL })`.
5. Read the session on the server in layouts, Server Components and Server Actions (`auth.api.getSession({ headers })`). Never trust a user ID sent from the browser.

### Google OAuth console
- Create an OAuth client (type Web application).
- Authorized redirect URIs: both the localhost and production callback URLs from section 1.
- OAuth consent screen: app name "Hummin'", logo, support email, links to `/privacy` and `/terms` (required), scopes `openid email profile` only.
- Keep it in "Testing" with your testers added until you publish it.

### Protecting routes
- `proxy.ts`: if there's no session cookie and the path is under `/hum`, `/me`, `/settings`, `/host`, `/admin`, redirect to `/login?next=<path>`. This is only a fast first check.
- The real check happens server-side in each protected layout and every Server Action / API route: get the session, return 401 or redirect if missing.
- Roles:
  - `admin`: email in `ADMIN_EMAILS`.
  - `host`: user is `claimed_by` on a `hosts` row; check ownership on every host action (`event.host_id` belongs to this user).
- Ownership rule for user data: every query on `events`, `saves`, `captures`, `reminders` filters by `user_id = session.user.id`.

### Sign-in flow details
- Signed-out user can try `/catch` and see the confirm card; tapping "Hum it" stores the draft in `sessionStorage`, sends them to `/login?next=/catch/confirm`, then restores and saves it.
- First sign-in → `/welcome` (area + interests) → `/hum`.
- Sign out clears the session server-side.
- Rate limit magic-link requests: 5 per email per hour, 20 per IP per hour.

---

## 6. User information: what we store and why
| Data | Where | Why | Who sees it |
|---|---|---|---|
| Name, email, avatar | `user` | Sign-in, emails | Only the user; hosts only if they opt in at RSVP |
| Area, radius, interests, timezone | `user_profiles` | Nearby events, digest, correct reminder times | Only the user |
| Approximate location | Browser only, or saved area | Distance filter, leave-by time | Not stored as precise GPS unless needed |
| Saved events, goin', check-ins | `saves`, `checkins` | The product; vibe bird | User; hosts see counts only (names only with opt-in) |
| Uploaded images | R2 private bucket | Extraction + showing the flyer back to the user | Only the uploader (signed URLs) |
| AI inputs/outputs | `captures` | Debugging, improving extraction | Admin only; delete images after 30 days |
| Email events (sent/opened) | Resend + `reminders` | Reminder reliability, host funnel | Aggregated for hosts |
| Analytics | PostHog | Product decisions | No uploaded content, no precise location |

Rules:
- Never sell data. Say so on the landing page and privacy policy.
- **Download my data** (JSON export) and **Delete account** (hard delete user rows + R2 images within 30 days) in Settings. California users expect both.
- Marketing emails (weekly digest) are opt-in with unsubscribe links; reminders are transactional.
- Privacy policy and terms pages before the Google consent screen goes live. Use a reputable template and have it reviewed once real data is flowing (not legal advice).
- Don't store or infer sensitive traits (health, religion, etc.). Interests and categories only.

---

## 7. File uploads (Cloudflare R2)
- Buckets are **private**. No public URLs for user uploads.
- Flow:
  1. Client converts HEIC → JPEG (`heic2any`) and requests `POST /api/upload` with file type and size.
  2. Server checks session, type (jpeg/png/webp/pdf), size (≤ 8MB), daily limit; returns a presigned PUT URL (valid ~5 min) and an `image_key` like `u/<userId>/<uuid>.jpg`.
  3. Client uploads directly to R2, then calls `/api/extract` with the `image_key`.
  4. Server downloads from R2, resizes with `sharp` (max 1500px, strip EXIF location data after reading the capture date), sends to Claude.
- Showing images back: short-lived presigned GET URLs.
- Lifecycle rule: delete `u/*` objects after 30 days unless the event is shared/listed (then copy a cleaned flyer to `public/` with host permission).
- R2 CORS: allow PUT from your app origins only.

---

## 8. AI (Claude via the Anthropic API)
- SDK: `@anthropic-ai/sdk`, called only on the server (`lib/ai/extract.ts`). The API key never reaches the browser.
- **Pipeline for each capture:**
  1. If a URL: fetch server-side (timeout 8s, max 2MB), parse schema.org `Event` JSON-LD → if found, skip AI.
  2. Otherwise call `AI_MODEL_FAST` with: system prompt (rules from SPEC.md), the image (base64 JPEG) and/or text, `captured_at`, `user_timezone`, `today`.
  3. Force structured output with a single tool (`save_events`) whose `input_schema` is the JSON schema in SPEC.md; set `tool_choice` to that tool.
  4. Validate the tool input with Zod. Invalid → retry once.
  5. Any event with `confidence < 0.6` or invalid dates → retry once with `AI_MODEL_STRONG`.
  6. Post-process in code: build `start_at` from `start_local` + timezone, validate RRULE with `rrule`, normalize price/free, guess category if missing.
  7. Log to `captures` (model, latency, tokens, result).
- **Limits and cost control:** `AI_DAILY_LIMIT_PER_USER` (30), max 10 images per batch, set a monthly spend cap in the Anthropic Console, track tokens per capture in `captures` so you know your real cost per save.
- **Timeouts:** 30s max per request; show "Still working…" at 12s on the client.
- **Prompt file:** keep the prompt in `lib/ai/prompt.ts` with a version number; store the version in `captures` so you can compare.
- **Test set:** keep 20–30 real flyers/screenshots in `tests/fixtures/` with expected JSON; `npm run eval:extract` runs them and reports accuracy. Run it whenever you change the prompt or model.
- Prompt-injection safety: treat text in images/pages as data. The model only fills the schema; it never triggers actions.

---

## 9. Email (Resend)
- Verify your domain in Resend; add the SPF, DKIM and DMARC DNS records in Cloudflare. Without these, emails land in spam.
- Templates with React Email in `lib/email/`: MagicLink, Reminder (evening before), LeaveBy / Starting soon, WeeklyDigest (later), HostNotify (later).
- Reminder job (`/api/cron/reminders`):
  1. Check `Authorization: Bearer CRON_SECRET`.
  2. Select reminders with `send_at <= now()` and `sent_at is null` (limit 200), lock rows (`for update skip locked`).
  3. Send email, set `sent_at`; for recurring events schedule the next occurrence.
  4. Idempotent: running twice never double-sends.
- Every email includes the event, time in the user's timezone, add-to-calendar link, "I can't make it" link, and notification settings link.

---

## 10. Security checklist
- [ ] All secrets in env vars; `.env*` in `.gitignore`.
- [ ] Every Server Action and API route checks the session and ownership.
- [ ] Zod validation on every input (forms, API bodies, AI output, URL params).
- [ ] Rate limits: extraction, uploads, magic links, invites (store counters in Postgres; add Redis only if needed).
- [ ] Server-side URL fetching blocks private/internal IPs (SSRF) and only allows http/https.
- [ ] Uploads: type + size checks, private bucket, signed URLs, EXIF GPS stripped.
- [ ] Security headers (CSP, `X-Frame-Options`, `Referrer-Policy`) in `next.config`.
- [ ] Cookies: `Secure`, `HttpOnly`, `SameSite=Lax` (Better Auth defaults).
- [ ] Cron endpoint requires `CRON_SECRET`.
- [ ] Admin routes check `ADMIN_EMAILS` server-side.
- [ ] Sentry captures errors; no personal data in logs.
- [ ] Dependabot or `npm audit` on.

---

## 11. Monitoring and analytics
- **Sentry:** errors on server and client, with release tags from Railway.
- **PostHog events:** `capture_started`, `capture_extracted` (source, confidence, ms), `capture_confirmed` (fields edited), `event_saved`, `going_toggled`, `reminder_opened`, `explore_filter_used`, `share_clicked`, `invite_answered`. Key metrics: saves per user per week, week-2 and week-4 retention, % of extractions confirmed without edits.
- **Railway metrics:** CPU, memory, response times; alert on deploy failure.

---

## 12. Costs to watch at launch
Railway (app + Postgres + cron), R2 storage (tiny at first), Anthropic usage (per capture; cap it), Resend (free tier covers early volume), domain. Check each provider's current pricing page and set spend alerts on Railway and Anthropic before you share the link publicly.

---

## 13. Launch-day checklist
- [ ] Production env vars set, migrations applied, seed events in Explore.
- [ ] Google OAuth consent screen published with privacy/terms links.
- [ ] Resend domain verified, test magic link and reminder emails land in inbox (Gmail + iCloud).
- [ ] Spend limits on Anthropic and Railway.
- [ ] Sentry receiving errors; PostHog receiving events.
- [ ] Tested on iPhone Safari, Android Chrome, desktop Chrome/Safari: sign in, capture (camera + upload + link), confirm, save, calendar, reminder.
- [ ] PWA icons and "Add to Home Screen" work.
- [ ] Backups on.

## Cursor prompts for this doc
- "Read INFRA.md section 5. Set up Better Auth with Google and magic link using the Drizzle adapter and Resend for the magic-link email. Add proxy.ts protection and a server-side requireUser() helper."
- "Read INFRA.md section 7. Build /api/upload returning presigned R2 PUT URLs with the checks listed, and the client upload helper with HEIC conversion."
- "Read INFRA.md section 8 and SPEC.md 'AI extraction'. Build lib/ai/extract.ts with JSON-LD link import, Claude tool-use structured output, Zod validation, the Sonnet retry, and capture logging. Add tests/fixtures and an eval script."
- "Read INFRA.md section 9. Build the reminders cron endpoint and the Reminder email template."
