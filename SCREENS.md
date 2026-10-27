# Hummin' — Screen Specs

> Companion to SPEC.md and DESIGN.md. Every screen here has a mockup on the canvas (pages "Prototype" and "Screens"). For each screen: route, purpose, what's on it, what each action does, states, and the desktop version.

## Navigation map
```
Landing (/) ──► Sign in ──► Welcome (area + interests) ──► Your hum (/hum)
                                                          │
  Bottom nav / sidebar:  Your hum  ·  [Catch]  ·  Explore │
                                                          ▼
Catch (/catch) ─► Camera | Upload | Paste link | Paste text
      └─► Reading… ─► one event:  Is this right? ─► saved ─► Your hum (toast)
                    └► several:   We found N events ─► review each ─► saved
Your hum / Explore / Host page ─► Event page (/e/[id])
      └─► I'm goin' · Hum it · Add to calendar · Ask a friend · Follow host
Profile (/me) ─► Your hummingbird (vibe) · Settings
Hosts: Host page (/h/[slug]) · Claim · Dashboard (/host) · Create event · Plans
```

---

## 1. Your hum — `/hum`
**Purpose:** everything you saved, so you never forget.
- Header: logo, profile button (→ `/me`).
- Title "Your hum" + summary line ("5 saved · 3 this week").
- Tabs: **This week · Upcoming · Recurring**. Recurring shows each series once, with the next date.
- EventCard list sorted by start time. Tags: price, "Weekly/Monthly", "Goin'" (lime).
- Weekend teaser card (dark): top 2–4 listed events near you → Explore.
- **Tap a card →** Event page. Long-press / swipe (phase 2): Mark as goin', Remove.
- States: loading (3 skeleton cards), empty per tab ("Nothing here yet" + Catch and Explore buttons), past events move to a "Past" view in Settings/history.
- Desktop: same list, max 720px; teaser card moves to a right rail.

## 2. Explore — `/explore`
**Purpose:** discover what's hummin' near you.
- Title "Hummin' near you" + area line ("Menlo Park · within 5 mi"), tap to change area.
- Search bar: events, places, hosts.
- **Quick filters (chips, always visible):** Tonight · This weekend · This week · Free.
- **Filter button** with a badge for active filter count → Filters sheet (below).
- **List / Map toggle.**
- List rows: tile (category) + title + when + place · price + "Hum it" button (→ "Saved", sage). Tapping the row (not the button) opens the Event page.
- Result count: "14 things hummin'". Empty: "Quiet for now. Try another day or category." + Reset filters.
- Sort (in sheet): Soonest (default) · Closest · Most hummed.
- Desktop: list left (420px) + sticky map right; filters as a horizontal bar + "More filters" popover.

### 2a. Filters sheet
Bottom sheet on phone, popover on desktop. Filters combine with AND; within a group, OR.
| Group | Options | Notes |
|---|---|---|
| When | Today · Tomorrow · This weekend · This week · Pick dates | Single choice; "Pick dates" opens a range calendar |
| Time of day | Morning (before 12) · Afternoon (12–5) · Evening (5–9) · Late (after 9) | Multi |
| Distance | Slider 1–25 mi, default 5 · "Walking distance only" toggle (≈1 mi) | Needs area or location |
| Price | Free · Under $20 · Under $50 · Any | Single |
| Category | Wellness · Food and drink · Art and making · Music · Community · Fitness · Learning | Multi |
| Good for | Going solo · Beginners · Meeting people · Date night · Kids welcome · Dogs welcome | Multi; from host tags + vibe check-ins |
| Sort | Soonest · Closest · Most hummed | Single |
- Sticky footer button shows the live count: "Show 14 events". "Reset" top right.
- Remember last-used filters per user (localStorage + profile).

### 2b. Map view
- Pins for each result; clusters show a count; selected pin is large lime.
- Your location as a blue dot (only after permission).
- "Search this area" pill appears after panning.
- Tapping a pin opens a preview card at the bottom: tile, title, place · distance · price, tags, **Details** and **Hum it**.
- Phase 2 (needs geocoded events).

## 3. Event page — `/e/[id]`
**What happens when you tap an event** (from Your hum, Explore, map, host page or a shared link):
- **Hero** in the category tint: back, share, category label, title (serif), when · where.
- **Countdown chip** when saved: "Tonight", "Tomorrow", "In 2 days".
- **Actions:** I'm goin' (toggle; lime when on) · Hum it / In your hum · Add to calendar (Google link + .ics) · Ask a friend.
  - I'm goin' also saves it if not saved.
  - Hum it creates a `saves` row and schedules reminders.
- **Register / Get tickets** button when `source_url` exists → opens the host's page (Luma etc.) in a new tab. We never sell their tickets in v1.
- **Leave-by card** (when goin' and location known): "Leave by 9:40 AM · 8 min drive" + parking note.
- **Who's goin':** "2 friends and 14 others" (friends phase 2; counts only, never names of strangers).
- **Reminders block:** times and channel; tap to change.
- **Good to know:** tags (bring a mat, beginner-friendly, outdoors…).
- **The vibe** card (phase 2, shown after 5+ check-ins).
- **Host row:** avatar, name, Follow → host page.
- **"I can't make it"** link: sets status to skipped, cancels reminders.
- Unsaved state: "Hum it to get reminders" note instead of reminders block.
- Owner-only menu (•••): Edit, Delete, Make shareable.
- Public share version (`/e/[id]?s=slug`): same page; signed-out visitors see "Hum this" (→ sign in) instead of private blocks.
- Desktop: hero left column, details right.

### 3a. Ask a friend (sheet)
- Mini event card, editable message ("Want to do yoga in the park Saturday at 10? I'm goin'."), send with: Copy link · Messages · WhatsApp · IG story (uses the Web Share API where available).
- The friend's link shows the event page with your first name and **I'm in · Maybe · Can't** — no account needed to answer; "I'm in" offers to hum it.

## 4. Catch — `/catch`
### 4a. Camera (default on phones)
- Live viewfinder (use `getUserMedia` for a live view; fall back to `<input capture="environment">`).
- Top: close, title, flash toggle. Hint line: "Works on flyers, posters, chalkboards and screens".
- **Flyer detection (nice-to-have):** lime outline and "Flyer found · hold still" chip.
- Bottom: mode switch **Photo · Screenshot · Link · Text**; shutter (lime); last-photo thumbnail (opens library); batch counter ("2 in batch") — take several photos then read them together.
- Permissions denied → explain and show Upload instead.
- Desktop: no camera; drag-and-drop zone + paste box.

### 4b. Upload ("Add from")
**Yes, you can upload.**
- Recent screenshots grid with multi-select (numbered).
- Photo library: up to 10 images per batch (JPEG, PNG, HEIC, WebP).
- Files: PDF (first 3 pages) and images.
- Paste a link · Paste text.
- Forward an email (`you@in.hummin.app`) — marked Soon.
- Note: Android can share straight from Instagram (PWA Web Share Target); iPhone users screenshot and pick here.
- Button: "Read 3 screenshots". Max 8MB per file.

### 4c. Paste a link / text
- Link input; detected source shown under it ("Luma event · imported exactly, no guessing") with a preview card.
- Instagram links: amber note "Instagram requires a login. Screenshot the post instead."
- Text area for newsletters, group chats, captions.
- Reminder that registration still happens on the host's page.

### 4d. Reading
- Ink screen, three pulsing lime bars, "Reading your flyer…" / "Finding the date, place, price and whether it repeats". Target under 5s; after 12s show "Still working…"; on failure: "Couldn't read that one. Try a clearer photo or type it in" + Enter manually.

### 4e. Several events found
- "We found 4 events" + source chip ("From 3 screenshots").
- Checkbox cards; unclear ones in amber ("Date unclear · you'll add it next"); duplicates unchecked with "Already in your hum".
- Primary: "Review 3 events" (steps through confirm cards). Secondary: "Save all without checking" (only allowed when none are amber).

### 4f. Is this right? (confirm)
- "Found 6 of 7 details" chip; flyer thumbnail; every field editable: Event, Date, Starts, Ends, Where (with place autocomplete), Price, Repeats, Category.
- Missing fields amber with "Not on the flyer".
- Reminder note; Retake / **Hum it**.
- Duplicate check on save → "Looks like you already saved this" (Keep both / Open existing).
- After save → Your hum with toast "Saved. Reminder set for Fri at 6 PM".

## 5. Profile — `/me`
### 5a. Your hummingbird (vibe)
**Yes — this fits the brand perfectly.** An animated hummingbird whose colors come from your month:
- Body = your top category color, throat = second, wings = third (deeper versions of the category tints).
- Gentle hover + wing flutter; respects reduced motion.
- "Your vibe this month": a name (Calm explorer, Social foodie, Night owl…) + a line ("11 events · 6 new places · mostly mornings") + category mix bars.
- Computed from saves (weight 1) and check-ins/"went" (weight 3) over the last 30 days; needs 3+ events, otherwise show a grey bird "Hum a few events to color your bird".
- Private by default; **Share** makes a story-sized image card (great organic marketing, like Spotify Wrapped).
- Monthly "Your October in Hummin'" recap reuses it.
- Later: the bird appears small next to your name on "Who's goin'" (friends only).
### 5b. Settings
Area, interests, timezone, reminder timing, notifications, download my data, delete account, sign out.

## 6. Hosts (who pays)
### 6a. Host public page — `/h/[slug]`
- Banner (category tint), avatar, name + verified badge, type · area, short bio.
- Stats: followers · upcoming · recurring.
- **Follow** (lime) → you hear about their next events.
- Tabs Upcoming · Recurring · Past; rows with Hum it / Saved.
- Auto-created when a captured or listed event has a host name; **unclaimed** pages show "Is this your business? Claim this page for free".

### 6b. Claim flow
Claim → sign in → verify (email on the business's website domain, or Instagram DM code, or manual review by admin) → page becomes verified; existing events attach to the host account.

### 6c. Create event — `/host/events/new`
- "Have a flyer? Snap it" shortcut (same extraction pipeline).
- Fields: name, date, time, repeats (Once · Weekly · Monthly · Custom), price, spots + waitlist toggle, ticket link, "Good for" tags, description, photo.
- Visibility: Listed in Explore / Link only.
- "Tell my 340 followers" toggle (Pro).
- Preview · **Publish to Explore**.

### 6d. Host dashboard — `/host` (desktop-first, responsive)
- Sidebar: Overview · Events · Guests and check-in · Followers · Boosts · Page and settings; plan status.
- Funnel cards: **Saved → Reminded → Opened reminder → Said goin' → Checked in** (+ first-timers).
- Upcoming events table: saved, goin', spots, action (Notify savers · Almost full · Boost).
- Audience interests bars; "Featured this Thursday" card.
- Print QR poster (for their physical board → their host page).
- Guest names only for guests who opted in at RSVP ("Share my name with Clay Studio").

### 6e. Plans — `/host/plans` (suggested prices, test them)
| Plan | Price | Includes |
|---|---|---|
| Free | $0 | Claim page, verified badge, unlimited events, save counts |
| Pro | $19/mo (30-day free trial) | Full funnel per event, notify past savers + followers, QR check-in + opt-in guest list, audience insights, 1 featured digest spot/month |
| Venue and partner | Custom | Multiple locations, branded board + printed QR kit, digest sponsorship (studios, shopping centers, buildings, associations) |
| Boost one event | $25 / 7 days | Top of Explore nearby |
Billing: Stripe Checkout + Customer Portal. Boosts are clearly labeled "Promoted" in Explore.

## Extra data needed (add to SPEC.md data model)
```
hosts         id, slug, name, type, area, bio, avatar_key, banner_color, claimed_by (user_id|null),
              verified (bool), plan ('free'|'pro'|'partner'), stripe_customer_id, created_at
events        + host_id (fk, nullable), capacity (int|null), waitlist (bool), good_for (text[]),
              ticket_url, boosted_until (timestamptz|null)
saves         + share_with_host (bool, default false), checked_in_at (timestamptz|null)
invites       id, event_id, from_user_id, slug, created_at
invite_replies id, invite_id, name, answer ('in'|'maybe'|'cant'), created_at
vibe_snapshots user_id, month, mix (jsonb), vibe_name, created_at
```

## Build order for these screens
1. Filters sheet + quick chips (Explore list) — with Phase 7.
2. Upload multi-select + several-events flow — with Phase 5.
3. Event page actions (goin', calendar, ask a friend) — with Phases 6 and 8.
4. Host pages: public page + claim + create event — after launch with users.
5. Dashboard + plans + Stripe — when the first hosts are active.
6. Hummingbird vibe — once people have a month of saves (great for a launch-month recap).
