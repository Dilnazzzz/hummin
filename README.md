# Hummin'

![CI](https://github.com/Dilnazzzz/hummin/actions/workflows/ci.yml/badge.svg)

Never miss what's hummin'. Save events from anywhere. Actually go.

![Hummin' — Explore view with listed events and a map](public/screenshot.png)

Hummin' is a mobile-first web app for catching local events from wherever they turn up: a photo of a flyer, a screenshot of a story, a pasted link or a block of text. It reads the event with AI, asks you to confirm the details, and then remembers it for you, including the recurring ones, with a map of what's happening nearby.

## Features

- **Capture from anything.** Camera or library photos (HEIC supported), up to ten screenshots at once, drag-and-drop or clipboard paste on desktop, links, or plain text.
- **Exact import for event links.** Luma, Eventbrite, Partiful and any page with schema.org `Event` data are imported verbatim, with no model involved.
- **AI reading with a fixed schema.** Flyers and text are read into a typed structure: title, local start and end, venue, address, price, host, category, recurrence, a confidence score and the fields that were not visible. A stronger model re-reads anything uncertain.
- **Confirm before save.** Every field is editable; anything the flyer didn't contain is highlighted. Likely duplicates are flagged before saving.
- **Your hum.** Saved events grouped as This week, Upcoming and Recurring, with the next occurrence of each series computed in its own timezone.
- **Explore.** Events people chose to list, filtered by time, price and category, with distance from your area and a map.
- **Private by default.** An event is visible only to you unless you list it. Listing can be reversed at any time.
- **Sign in without passwords.** Google or an emailed magic link.

## How it works

```
capture (photo · screenshots · link · text)
   └─► POST /api/extract
         ├─ image clean-up: rotate, resize to 1500px, strip metadata
         ├─ link? fetch (guarded) → schema.org Event → draft   (no model call)
         └─ otherwise: fast model → low confidence? → strong model
                         structured output, validated in code
   └─► /catch/confirm  (every field editable)
         └─► save: duplicate check → geocode venue → event + save rows
               ├─ /hum        This week · Upcoming · Recurring
               ├─ /e/[id]     goin', calendar, register, list/unlist
               └─ /explore    filters, distance, map
```

Design principle: the model reads, code decides, the user confirms. Nothing is written without the confirm step. Dates are resolved relative to when the capture was taken and stored as instants together with the event's IANA timezone; recurrence is stored as an RFC 5545 rule and expanded at read time.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS v4 |
| Database | Postgres with Drizzle ORM |
| Authentication | Better Auth (Google OAuth, email magic link) |
| AI | Anthropic API, structured outputs validated with Zod |
| Images | sharp on the server, heic2any in the browser |
| Dates | date-fns-tz, rrule |
| Map and geocoding | MapLibre GL with OpenFreeMap tiles, Nominatim |
| Email | Resend |
| Hosting | Railway (app, Postgres, volume for uploads) |

## Getting started

Requirements: Node.js 20 or later, Docker for a local Postgres, and an Anthropic API key.

```bash
# 1. Database
docker run -d --name hummin-pg \
  -e POSTGRES_USER=hummin -e POSTGRES_PASSWORD=hummin -e POSTGRES_DB=hummin \
  -p 5433:5432 -v hummin-pgdata:/var/lib/postgresql/data postgres:16-alpine

# 2. Configuration
cp .env.example .env.local        # set DATABASE_URL, BETTER_AUTH_SECRET, ANTHROPIC_API_KEY

# 3. Install, migrate, seed, run
npm install
npm run db:migrate
npm run db:seed                   # sample listed events so Explore has content
npm run dev                       # http://localhost:3000
```

In development no email is sent: after requesting a sign-in link, the sign-in screen offers it directly and it is also printed in the terminal. To test the camera flow on a phone, open the network address printed by the dev server from a device on the same Wi-Fi.

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `BETTER_AUTH_SECRET` | yes | session signing key (`openssl rand -base64 32`) |
| `ANTHROPIC_API_KEY` | yes | reading flyers and text |
| `APP_URL`, `BETTER_AUTH_URL` | production | public origin of the deployment |
| `RESEND_API_KEY`, `EMAIL_FROM` | production | magic-link email delivery |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional | enables "Continue with Google" |
| `AI_MODEL_FAST`, `AI_MODEL_STRONG` | optional | model overrides (defaults: `claude-haiku-4-5`, `claude-sonnet-5`) |
| `AI_DAILY_LIMIT_PER_USER` | optional | extraction limit per user per day (default 30) |
| `UPLOAD_DIR` | optional | image storage directory (default `./.uploads`) |

See `.env.example` for the full list.

## Deployment

The application is a standard Next.js server. In production it applies pending database migrations on startup (`instrumentation.ts`), exposes `GET /api/health` for health checks, and expects a persistent directory for uploads at `UPLOAD_DIR`.

On Railway: one service for the app, one Postgres service, a volume mounted at `/data` with `UPLOAD_DIR=/data/uploads`, and the variables above. Google OAuth requires the callback URL `https://<domain>/api/auth/callback/google`; Resend requires a verified sending domain to deliver to arbitrary addresses.

## Development

```bash
npm run dev          # development server
npm run build        # production build; also type-checks and validates prerendering
npm run start        # serve the production build
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run db:generate  # create a migration from schema changes
npm run db:migrate   # apply migrations
npm run db:studio    # browse the database
```

Continuous integration runs lint and a production build on every push and pull request.

## Project structure

```
app/
  (marketing)/        landing, privacy, terms
  (auth)/             sign-in, onboarding
  (app)/              your hum, explore, event page, settings
  (capture)/          capture and confirm
  actions/            server actions for events and saves
  api/                auth, extract, files, health
components/           app shell, auth, capture, events, explore, ui
lib/
  ai/                 prompt, schema, extraction pipeline, link import
  db/                 Drizzle schema and client
  auth.ts session.ts  authentication and session helpers
  events.ts dates.ts  queries, recurrence and time helpers
  geocode.ts storage.ts env.ts
drizzle/              SQL migrations
scripts/seed.mts      sample data
instrumentation.ts    startup migrations
proxy.ts              route protection
```

## API

| Endpoint | Description |
|---|---|
| `POST /api/extract` | Multipart upload (`images[]`, `text`, `url`, `timezone`, `capturedAt`). Returns draft events. Rate limited per user and per IP. |
| `GET /api/files/:key` | Serves an uploaded image to its owner, or publicly when the event is listed. |
| `GET /api/health` | Returns 200 when the application and database are reachable. |
| `/api/auth/*` | Authentication endpoints. |

Writes are performed through server actions (`app/actions/events.ts`); each verifies the session and ownership on the server.

## Security and privacy

- Events, saved items and uploaded images are private to their owner unless the event is explicitly listed.
- Uploaded images are re-encoded and stripped of metadata, including location data, before storage or processing.
- Server-side link fetching rejects non-HTTP schemes and private network addresses.
- Text found inside images or pages is treated as content to extract, never as instructions to the model.
- Every extraction attempt is logged with model, latency and token usage; limits apply per user and per IP.

## Roadmap

- Calendar export (`.ics` with recurrence) and shareable event links
- Email reminders, with a re-check of the source link before sending
- Extended filters (time of day, distance, price, suitability tags)
- Object storage for uploads, analytics, installable PWA, data export and account deletion

## License

Copyright © 2026 Dilnaz Baltabayeva. All rights reserved.
