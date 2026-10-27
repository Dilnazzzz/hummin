# Hummin' — Design System

The look: calm paper base, ink text, one electric lime spark. Professional and minimal, with personality from the serif italic and the flyers themselves. Match the prototype on the canvas.

## Tokens (Tailwind v4 — paste into `app/globals.css`)
```css
@import "tailwindcss";

@theme {
  --color-paper: #FAF8F3;      /* app background */
  --color-surface: #FFFFFF;    /* cards, inputs, nav */
  --color-sunken: #EFECE4;     /* tab track, neutral chips */
  --color-line: #E4E0D6;       /* hairline borders */
  --color-line-strong: #C9C4B8;/* secondary button borders, dashed empty states */
  --color-ink: #1B1A20;        /* text, primary buttons, dark cards */
  --color-ink-2: #4A4752;      /* body secondary */
  --color-muted: #5E5B66;      /* meta text (passes 4.5:1 on paper) */
  --color-faint: #8A8792;      /* inactive nav only */
  --color-lime: #D4F53C;       /* accent FILLS only, never text on paper */
  --color-sage: #DCEBDF;       /* saved state, success */
  --color-sage-ink: #1E3A28;
  --color-warn: #FFF4D6;       /* missing field on confirm */
  --color-warn-line: #E8B93A;
  --color-warn-ink: #7A5200;

  /* category tints: bg / text */
  --color-cat-wellness: #DCEBDF;  --color-cat-wellness-ink: #1E3A28;
  --color-cat-food: #FBE3D4;      --color-cat-food-ink: #6B2E12;
  --color-cat-art: #E3E0FB;       --color-cat-art-ink: #2E2870;
  --color-cat-music: #D8EAF8;     --color-cat-music-ink: #123E62;
  --color-cat-community: #F6E9C6; --color-cat-community-ink: #5A4205;
  --color-cat-fitness: #E0F0F4;   --color-cat-fitness-ink: #0F4452;
  --color-cat-learning: #F3E1EC;  --color-cat-learning-ink: #5E1F45;

  --font-sans: var(--font-geist), system-ui, sans-serif;
  --font-serif: var(--font-instrument-serif), Georgia, serif;

  --radius-chip: 999px;
  --radius-card: 18px;
  --radius-panel: 24px;
  --radius-tile: 14px;
}

body { background: var(--color-paper); color: var(--color-ink); }
```
Dark mode: not in v1. The ink "dark cards" (vibe card, weekend teaser, reading screen) give contrast instead.

## Type
| Use | Style |
|---|---|
| Screen titles ("Your hum", "Is this right?") | Instrument Serif italic, 40–44px mobile / 52px desktop, line-height 1 |
| Event title on event page | Instrument Serif regular, 42px |
| Logo wordmark | Instrument Serif italic + signal mark |
| Card titles | Geist 600, 15–16px |
| Body | Geist 400, 15–16px |
| Meta (place, time) | Geist 400, 13px, `muted` |
| Labels, small caps headers | Geist 600–700, 11–12px, letter-spacing 0.06–0.1em, uppercase |
| Buttons | Geist 600, 14–16px |

Never use the serif for UI controls or long text.

## Components
- **Button / primary:** ink bg, paper text, pill, min-height 52px (48px secondary actions). Optional small lime dot after the label on "Hum it".
- **Button / lime:** lime bg, ink text — use for "I'm goin'" active state, the Catch button and one hero CTA. Max one lime button per screen.
- **Button / secondary:** surface bg, `line-strong` border, ink text.
- **Icon button:** 44×44 circle, surface bg, `line` border. Always has `aria-label`.
- **Chip / filter:** pill, min-height 40px. Inactive: surface + `line-strong` border. Active: ink bg, paper text. Use `aria-pressed`.
- **Chip / category:** category tint bg + its ink text; active = ink.
- **Chip / tag (small):** 12px text, 3px 9px padding — price, "Weekly", "Goin'" (lime).
- **Tabs:** `sunken` track with 4px padding, pill segments, active segment ink.
- **DateTile:** 58×58, `radius-tile`, category tint, day abbreviation (11px, 600, tracked) over time (15px, 600).
- **EventCard:** whole card is one `<button>`/`<Link>`: DateTile + title + place + tags. Surface bg, `line` border, `radius-card`, 12px padding.
- **Explore row:** card with a link area (tile + title + when + place · price) and a separate "Hum it" button (becomes sage "Saved").
- **Field (confirm screen):** stacked label (12px muted) + borderless input (16px — prevents iOS zoom) inside a surface box with `line` border. Missing: `warn` bg, `warn-line` border, "Not on the flyer" note in `warn-ink`.
- **Toast:** top of screen, ink bg, paper text, lime check circle, auto-hides after ~2.6s, `role="status"`.
- **Empty state:** dashed `line-strong` border, title + one helpful sentence + optional action.
- **Dark card:** ink bg, paper text, lime small-caps label (vibe card, weekend teaser).
- **Reading animation:** three lime rounded bars scaling (0.9s ease-in-out, staggered 0.15s). Respect `prefers-reduced-motion` (show static bars + text).

## Navigation (AppShell)
- **< 1024px:** bottom nav fixed, white, top hairline, 88px + safe area. Left: "Your hum" (list icon). Center: 60px lime circle Catch button with camera icon, raised 26px, 4px paper ring. Right: "Explore" (compass icon). Active item ink, inactive `faint`. Hidden on capture, reading and confirm screens.
- **≥ 1024px:** left sidebar 248px: logo at top, nav items (Your hum, Explore), full-width lime "Catch an event" button, Settings at bottom. Content area max-width 720px, centered in the remaining space; Explore uses up to 1200px for list + map.

## Logo
Wordmark "hummin" in Instrument Serif italic followed by the signal mark (dot + two arcs) in place of the apostrophe. App icon: signal mark in ink on a lime rounded square.
```svg
<svg viewBox="0 0 34 40" aria-hidden="true"><circle cx="6" cy="22" r="5" fill="currentColor"/><path d="M14 12a14 14 0 0 1 0 20" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M22 5a24 24 0 0 1 0 34" stroke="currentColor" stroke-width="3.4" fill="none" stroke-linecap="round"/></svg>
```
Make it a `<Logo />` component with `size` and `color` props. Export favicon and PWA icons (192, 512, maskable) from the app-icon version.

## Icons
Use `lucide-react`, stroke width 1.8–2: list, compass, camera, upload, link, x, chevron-left, calendar, map-pin, ticket, repeat, share, bell, check, user.

## Voice and copy
Warm, curious, a little playful; like a friend who always knows what's on. Sentence case. No exclamation marks in the UI.
- Save button: **Hum it** · saved state: **In your hum** / **Saved**
- Going: **I'm goin'** → **You're goin'**
- Home: **Your hum** · Explore: **Hummin' near you** · Capture: **Catch an event**
- Confirm: **Is this right?** / "Check the details before it's saved."
- Reading: **Reading your flyer…**
- Empty: "Nothing here yet" / "Snap a flyer or browse Explore to fill your hum."

## Accessibility
- Real `<button>`, `<a>`, `<label>` + `<input>`; never clickable divs.
- Text contrast ≥4.5:1 (use `muted` not `faint` for meta text). Lime is never text on paper.
- Visible focus ring: 2px ink outline, 2px offset.
- Inputs 16px+ so iOS doesn't zoom.
- Every icon-only button has an `aria-label`.
