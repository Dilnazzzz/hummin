# Hummin' — Project Spec

> Keep this file and DESIGN.md in the repo root. Start every Cursor task with: "Read SPEC.md and DESIGN.md first."

**Tagline:** Never miss what's hummin'.
**Descriptor:** Save events from anywhere. Actually go.

## What we're building
A responsive web app (phone-first, works great on desktop) that lets people **catch events from anywhere** — photo of a flyer, screenshot of an Instagram story, pasted link or text — uses AI to turn that into a structured event, then **remembers it for them**: reminders, calendar, recurring events. An **Explore** tab shows what's hummin' nearby with filters.

Problem: local events are scattered across Instagram, newsletters, group chats and cafe boards. People find them by luck, save them, then forget — especially recurring ones.

## Principles
- Capture feels instant: open → snap/upload/paste → confirm → saved, under 15 seconds.
- **Never save AI output without the "Is this right?" confirm step.** A wrong date destroys trust.
- Private by default. Sharing is explicit.
- **Mobile-first and responsive.** Design at 390px first, then scale up (see Responsive layout).
- One codebase, installable to the home screen (PWA). No native app in v1.

## Stack
- **Framework:** Next.js (latest, App Router, TypeScript, Server Actions + Route Handlers)
- **Styling:** Tailwind CSS v4 (tokens in `app/globals.css` via `@theme`, see DESIGN.md) + shadcn/ui primitives restyled to our tokens
- **Fonts:** `next/font/google` — Instrument Serif (400, italic) and Geist (400/500/600/700)
- **Hosting:** Railway (app + Postgres + cron service)
- **DB/ORM:** Postgres + Drizzle ORM
- **Auth:** Better Auth (Google OAuth + email magic link)
- **File storage:** Cloudflare R2 (S3-compatible SDK)
- **AI:** Anthropic API — `claude-haiku-5-5` default, retry with `claude-sonnet-5-5` on low confidence. Tool use with a JSON schema for structured output.
- **Email:** Resend + React Email
- **Images:** `heic2any` client-side for HEIC; `sharp` server-side to resize to max 1500px JPEG
- **Dates:** `date-fns` + `date-fns-tz`; recurrence with `rrule`
- **Maps (phase 2):** MapLibre GL + a free tile provider, or Mapbox
- **Analytics:** PostHog
- **Validation:** Zod for every form, API input and AI output

## Env vars
```
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
EMAIL_FROM=
APP_URL=
CRON_SECRET=
ADMIN_EMAILS=
NEXT_PUBLIC_POSTHOG_KEY=
```

## Data model
```
users          id, email, name, image, timezone (IANA), created_at
user_profiles  user_id, area (text, e.g. "Menlo Park"), lat, lng, radius_miles (default 5),
               interests (text[]: wellness|food|art|music|community|fitness|learning),
               reminder_evening (bool, default true), reminder_hours_before (int, default 2)
events         id, user_id, title, description, category (enum above), start_at (timestamptz),
               end_at, timezone, all_day, venue_name, address, lat, lng, price_text, is_free,
               host, source_url, source_type ('photo'|'upload'|'link'|'text'|'admin'),
               image_key, rrule (nullable), repeat_text (nullable, human label),
               is_listed (bool, default false — shows in Explore),
               share_slug (unique, nullable), ai_confidence, ai_raw (jsonb), created_at, updated_at
saves          id, user_id, event_id, status ('saved'|'going'|'went'|'skipped'), created_at
               unique(user_id, event_id)
reminders      id, save_id, occurrence_at, send_at, sent_at (nullable), channel ('email')
captures       id, user_id, image_key, raw_text, source_url, extracted (jsonb), model, created_at
follows        id, user_id, host (text), created_at          (phase 2)
checkins       id, user_id, event_id, energy, met_someone, would_return, tags (text[]), created_at  (phase 2, vibe)
```
Why `saves` is separate from `events`: the same Explore event can be saved by many people, and a captured event belongs to its creator but can later be shared or listed.

## AI extraction
**Route:** `POST /api/extract` — accepts image (multipart) and/or `text`, `url`.

**Link import first:** if a URL is from Luma, Eventbrite, Partiful or any page with schema.org `Event` JSON-LD, fetch it server-side and parse the structured data — no AI guessing. Fall back to AI on the page text. Instagram links can't be fetched (login wall): tell the user to screenshot instead.

**Inputs to the model:** resized image and/or text, `captured_at` (EXIF date if present, else upload time), `user_timezone`, `today`.

**Prompt rules:**
- Resolve relative dates ("this Sat", "every first Sunday") relative to `captured_at`.
- No year shown → next occurrence on/after `captured_at`.
- Field not visible → null and list it in `missing_fields`. Never invent.
- Multiple events on one flyer → return all.
- Recurrence → RFC 5545 RRULE plus a human `repeat_text`.
- Pick one `category` from the enum.

**Schema:**
```json
{ "events": [{
  "title": "string", "description": "string|null",
  "start_local": "YYYY-MM-DDTHH:mm|null", "end_local": "YYYY-MM-DDTHH:mm|null",
  "all_day": "boolean", "timezone": "IANA",
  "venue_name": "string|null", "address": "string|null",
  "price_text": "string|null", "is_free": "boolean|null",
  "host": "string|null", "source_url": "string|null",
  "category": "wellness|food|art|music|community|fitness|learning",
  "rrule": "string|null", "repeat_text": "string|null",
  "confidence": "number 0-1", "missing_fields": ["string"]
}]}
```
**Fallback:** any event with `confidence < 0.6` → retry once with Sonnet.
**Limits:** 8MB upload, 30 extractions per user per day. Log every attempt in `captures`.

## Screens (match the prototype on the canvas)
| Route | Screen | Notes |
|---|---|---|
| `/` | Landing | Logo, tagline, descriptor, "Get started", 3-step explainer (Snap it · Hum it · Show up), demo GIF. Signed-in users redirect to `/hum`. |
| `/login` | Sign in | Google + magic link. Can be reached mid-capture; return to where they were. |
| `/welcome` | Onboarding | Area (with "use my location"), pick 3+ interests. Skippable. |
| `/hum` | Your hum | Tabs: This week · Upcoming · Recurring. Event cards with date tile, place, price, "Weekly", "Goin'" chips. Empty state. "This weekend near you" teaser card linking to Explore. |
| `/catch` | Catch an event | Camera viewfinder (`<input type="file" accept="image/*" capture="environment">`), Screenshot upload, Paste link/text. Desktop: drag-and-drop zone + paste box instead of camera. |
| `/catch/reading` (or client state) | Reading your flyer… | Three pulsing lime bars on ink. |
| `/catch/confirm` | Is this right? | "Found 6 of 7 details" chip, every field editable, missing fields highlighted amber, Retake / Hum it. Duplicate warning if similar event exists. |
| `/explore` | Hummin' near you | Filters: Tonight · This weekend · This week, Free, category chips. List with "Hum it" per row. Map in phase 2. |
| `/e/[id]` | Event page | Category hero, when/where/price/repeats, I'm goin', Hum it, Add to calendar, Ask a friend, reminder status, vibe card (phase 2), host + Follow (phase 2). Public via `share_slug`. |
| `/settings` | Settings | Area, interests, timezone, reminder timing, download my data, delete account. |
| `/privacy`, `/terms` | Legal | Required for Google sign-in. |
| `/admin` | Admin (ADMIN_EMAILS only) | Create/edit listed Explore events by capture or form — how Explore gets seeded at launch. |

Unsigned visitors can try capture and see the confirm card; saving asks them to sign in.

## Responsive layout
Mobile-first. Breakpoints: base (<768), `md` (≥768), `lg` (≥1024).
- **Phone (base):** single column, max content width 100%, 20px side padding. Bottom nav (Your hum · lime Catch button · Explore), 88px tall, respects `env(safe-area-inset-bottom)`. Confirm screen has a sticky bottom action bar.
- **Tablet (md):** content centered, max-width 640px. Bottom nav stays.
- **Desktop (lg):** left sidebar nav (logo, Your hum, Explore, big "Catch an event" button, settings at bottom), content max-width 720px. Explore becomes two columns: list left, map right (sticky). Event page: hero left, details right. Catch: drag-and-drop zone + paste box side by side; camera hidden.
- Use `dvh` units for full-height screens on mobile. No horizontal scroll at 320px wide. Touch targets ≥44px.
- One `AppShell` component handles nav switching by breakpoint; pages never duplicate nav.

## Calendar
- Google Calendar template link
- `.ics` download per event (includes RRULE)
- Phase 2: personal subscribable ICS feed per user

## Reminders
- Defaults: evening before at 6pm user time, and N hours before (from profile).
- Recurring: schedule only the next occurrence; schedule the following one after it passes.
- Before sending, if `source_url` exists, re-check it when possible; if the event looks canceled or moved, say so in the email.
- Railway cron every 15 min → `POST /api/cron/reminders` with `CRON_SECRET` header.

## Duplicate detection
On save: same user + normalized title similarity + start within ±2h → "Looks like you already saved this."

## Build phases (one Cursor task each — test and commit between)
- [x] **1. Foundation:** Next.js + TS + Tailwind v4 tokens from DESIGN.md + fonts + `AppShell` (bottom nav ↔ sidebar) + placeholder pages for every route. Deploy to Railway. _(Code done 2026-10-26; Railway deploy still pending.)_
- [x] **2. UI kit:** Button, Chip, Tabs, EventCard, DateTile, Field, Toast, EmptyState, Logo — built from DESIGN.md, shown on a `/dev/ui` page. Build `/hum`, `/explore` and `/e/[id]` with hard-coded sample data so the app looks like the prototype end to end.
- [x] **3. Data + auth:** Drizzle schema + migrations, Railway Postgres, Better Auth (Google + magic link), `/login`, `/welcome`, protected routes.
- [x] **4. Capture:** `/catch` with camera/upload/paste, HEIC convert, resize, R2 upload; desktop drag-and-drop.
- [x] **5. Extraction:** `/api/extract` (JSON-LD link import + Claude), reading screen, confirm screen, save event + save row, captures log, rate limit.
- [x] **6. Real data:** `/hum` tabs from DB, event page, I'm goin', edit, delete.
- [x] **7. Explore:** listed events, filters, Hum it from list; `/admin` to seed events. _(2026-10-26: list + map + quick filters done; filters sheet and /admin pending, seed via `npm run db:seed`.)_
- [ ] **8. Calendar + sharing:** Google link, .ics, share slug page with "Hum this" CTA. _(Google link done 2026-10-26.)_
- [ ] **9. Reminders:** cron + Resend templates; domain SPF/DKIM/DMARC.
- [ ] **10. Launch polish:** landing page, privacy/terms, PWA manifest + icons, PostHog, feedback button, settings (export/delete).

**Later:** map, follows, vibe check-ins, weekly "What's hummin'" digest, friends going, newsletter-forwarding inbox, host dashboard, Stripe, web push.

## First Cursor prompt
> Read SPEC.md and DESIGN.md. Do Phase 1 only. Create a Next.js App Router project with TypeScript and Tailwind v4. Put the design tokens from DESIGN.md into app/globals.css using @theme. Load Instrument Serif and Geist with next/font. Build an AppShell that shows the bottom nav under 1024px and a left sidebar at 1024px and up, exactly as DESIGN.md describes. Create placeholder pages for every route in the Screens table. Don't add auth or a database yet. When done, list the files you created and how to run it.
