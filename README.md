# Hummin'

Never miss what's hummin'. Save events from anywhere. Actually go.

Read `SPEC.md`, `DESIGN.md`, `SCREENS.md` and `INFRA.md` before changing anything. Progress is tracked in the "Build phases" checklist in `SPEC.md`.

## Run it locally

```bash
# 1. Postgres in Docker (first time creates the container; later runs just start it)
docker start hummin-pg 2>/dev/null || docker run -d --name hummin-pg \
  -e POSTGRES_USER=hummin -e POSTGRES_PASSWORD=hummin -e POSTGRES_DB=hummin \
  -p 5433:5432 -v hummin-pgdata:/var/lib/postgresql/data postgres:16-alpine

# 2. Env: .env.local already exists with local values. Paste your key into ANTHROPIC_API_KEY=.

# 3. Install, migrate, seed demo events, run
npm install
npm run db:migrate
npm run db:seed
npm run dev          # http://localhost:3000
```

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run db:generate` (new migration after a schema change), `npm run db:studio`, `npm run auth:generate` (refresh Better Auth tables).

`.npmrc` sets `legacy-peer-deps=true` because `better-auth`'s peer ranges trip npm 10's resolver.

## Signing in during development

Sign-in is a magic link. Without `RESEND_API_KEY`, the link is printed in the terminal running `npm run dev`:

```
[hummin] Magic link for you@example.com
http://localhost:3000/api/auth/magic-link/verify?token=...
```

Open it and you land on `/welcome` (first time) or wherever you were going. Google sign-in switches on when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set (see `INFRA.md` section 5).

## How a capture flows

1. `/catch`: camera or library photo, drag-and-drop, clipboard paste, a link or text. HEIC converts in the browser.
2. `POST /api/extract`: resizes with sharp (max 1500px, metadata stripped), stores the JPEG under `.uploads/` (local stand-in for R2), then:
   - a link is fetched server-side (SSRF-guarded) and schema.org `Event` JSON-LD is used verbatim when present;
   - otherwise Claude reads the images/text with a structured-output schema (`lib/ai/schema.ts`). Fast model first (`AI_MODEL_FAST`, default `claude-haiku-4-5`); anything under 0.6 confidence or with a broken date is retried on `AI_MODEL_STRONG` (`claude-sonnet-5`).
   - every attempt is logged to `captures` with model, latency and tokens. 30 per user per day, 5 per IP signed out.
3. The result is held in `sessionStorage` and shown on `/catch/confirm`. Every field is editable; missing ones are amber. "List it in Explore" is off by default.
4. "Hum it" calls the `saveDraft` server action: duplicate check (similar title within ±2h), geocode the venue with Nominatim, insert the event and a `saves` row, back to `/hum` with a toast.

## Where things live

```
app/
  (marketing)/            /, /privacy, /terms
  (auth)/                 /login, /welcome (+ actions.ts: onboarding, profile)
  (app)/                  /hum, /explore, /e/[id], /settings, /me, /admin — inside AppShell
  (capture)/              /catch, /catch/confirm, /catch/reading — AppShell without bottom nav
  actions/events.ts       server actions: saveDraft, humEvent, setGoing, skip, delete, setListed
  api/auth/[...all]       Better Auth handler
  api/extract             capture → events
  api/files/[...key]      serves uploads with an ownership check
components/
  app-shell/              nav (bottom nav < 1024px, sidebar ≥ 1024px)
  auth/                   login form, welcome form
  catch/                  capture screen, confirm screen, reading overlay, draft store
  events/                 EventCard, DateTile, Tag, category colours
  explore/explore-map     MapLibre map (worker served from /public)
lib/
  ai/                     prompt, schema, extract pipeline, link import
  db/                     Drizzle schema (+ generated Better Auth tables), client
  auth.ts, auth-client.ts, session.ts, profile.ts
  events.ts               hum lists, explore query, duplicate detection
  dates.ts                timezone + recurrence helpers (rrule)
  geocode.ts              Nominatim search/reverse + distance
  storage.ts              local disk object store (swap for R2)
  env.ts                  Zod-validated env
drizzle/                  migrations
scripts/seed.mts          demo listed events near Menlo Park
proxy.ts                  cookie check → /login for protected paths
```

## Phase status

- [x] 1. Foundation (Railway deploy pending)
- [x] 2. UI kit (built inline as needed; no `/dev/ui` page yet)
- [x] 3. Data + auth (magic link; Google needs credentials)
- [x] 4. Capture (local disk instead of R2; PDF not yet)
- [x] 5. Extraction (needs `ANTHROPIC_API_KEY`)
- [x] 6. Real data (edit event not yet)
- [x] 7. Explore + map (filters sheet and `/admin` seeding not yet; use `npm run db:seed` or "List it in Explore")
- [ ] 8. Calendar + sharing (Google Calendar link done; `.ics` and share slug pending)
- [ ] 9. Reminders
- [ ] 10. Launch polish

## Notes

- Cache Components is on. Anything reading `params`, `searchParams`, cookies or the time must sit inside `<Suspense>` or `"use cache"`, or the build fails. Session reads live in small server components behind a boundary (`lib/session.ts`).
- Bundled, version-matched Next.js docs: `node_modules/next/dist/docs/`.
- Map tiles come from OpenFreeMap (no key). Geocoding is Nominatim at 1 request/second; fine for dev, swap before real traffic.
