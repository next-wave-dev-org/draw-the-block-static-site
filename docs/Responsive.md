# Responsive Architecture

The site uses a hybrid responsive system: **fluid scaling for typography and spacing**, **stepped sizing for the layout column**. This document explains how it all fits together.

If you're touching CSS on this codebase and aren't sure why something looks the way it does at a particular viewport, this is the place to look.

---

## The breakpoint ladder

Six viewport classes:

| Class | Range | Column max | Horizontal padding |
| :--- | :--- | :--- | :--- |
| Mobile | ≤ 480px | full viewport | 16px |
| Tablet | 481-768px | 600px | 24px |
| Standard | 769-1024px | 720px | 32px |
| Wide | 1025-1440px | 880px | 40px |
| Ultrawide | 1441-1920px | 1080px | 48px |
| Extra-wide | 1921px+ | 1200px | 56px |

Breakpoint values live as comments in `tokens.css` rather than CSS variables — CSS doesn't allow custom properties in `@media` query conditions, so any "single source of truth" via variables would be a fiction. Keep the values consistent across files by convention.

The column max-width and padding tokens DO live as CSS variables in `tokens.css` (`--col-max-tablet`, `--col-pad-tablet`, etc.) and are applied via the `.site-strip` rule in `base.css`. That rule is the single source of truth for column behavior.

---

## Fluid typography

Font sizes scale continuously with viewport width via `clamp(min, fluid, max)`. The fluid value is `calc(a*vw + b*px)` where `a` controls scaling speed and `b` is the anchor.

Example: `--fs-body: clamp(14px, calc(0.5vw + 12px), 17px)` means:
- At viewport=0, body text is 12px (just the constant)
- At viewport=400px, body text is 14px (hits the minimum, clamped)
- At viewport=1000px, body text is 17px (hits the maximum, clamped)
- Between those thresholds, it scales smoothly

**Tight clamps** (small range) for body and small UI text. They need to stay readable at every viewport without dramatic shifts.

**Wider clamps** for headings and display type. They get more visual presence at larger viewports.

**Hero-level type** (like the home page's DRAW THE BLOCK wordmark) defines its own clamp inline rather than using a token. Component-specific scaling is fine when a token would be too generic.

| Token | Range | Use |
| :--- | :--- | :--- |
| `--fs-body` | 14-17px | Body copy, prose |
| `--fs-nav` | 13-16px | Nav links |
| `--fs-kicker` | 11-13px | Kickers, small labels |
| `--fs-meta` | 10-12px | Dates, social meta, minor labels |
| `--fs-h3` | 16-22px | Card titles, small section headings |
| `--fs-h2` | 22-36px | Section headings, page titles |
| `--fs-countdown` | 36-80px | Countdown digits, large display |

---

## Fluid spacing

Eight spacing tokens (`--space-1` through `--space-8`), all `clamp()`-based. The fluidity is small for tight tokens and wide for hero-level spacing — small spaces should stay snappy on mobile, big spaces breathe at desktop.

| Token | Range | Use |
| :--- | :--- | :--- |
| `--space-1` | 3-4px | Hairlines, tight nudges |
| `--space-2` | 6-10px | Tight inline gaps |
| `--space-3` | 10-16px | Small gaps, button padding |
| `--space-4` | 14-24px | Standard gaps, card spacing |
| `--space-5` | 20-36px | Section breathing |
| `--space-6` | 28-56px | Large breaks between sections |
| `--space-7` | 40-80px | Major breaks |
| `--space-8` | 56-120px | Hero spacing |

Use these by default. If a layout needs a value not in the scale, either add a new token or use `clamp()` inline — but check first whether one of the existing tokens fits.

`--stack` is an alias for `--space-6` and is used by the `.stack > * + *` utility for vertical rhythm.

---

## When to use fluid vs stepped

**Use fluid (`clamp()` or `vw`-based) for:**
- Typography
- Spacing tokens
- Hero-level visual elements (logo, wordmark, mascot in compositions)
- Any element where smooth scaling improves the feel

**Use stepped (`@media` breakpoints) for:**
- Container max-widths (the column ladder)
- Grid column counts (3 cols on desktop → 2 on tablet → 1 on mobile)
- Layout structural changes (flex direction, hide/show elements)
- Any element where pixel precision matters

The mistake to avoid: making layout containers fluid. Cards and grids want predictable sizing — fluid containers introduce subtle "off" feelings at every width because nothing is at its tested sweet spot.

---

## How pages should consume this system

A page should:
- **Use the spacing tokens** (`--space-*`) for all margins, padding, gaps. Never hardcode pixel values for these.
- **Use the type tokens** (`--fs-*`) for all text sizes. Same rule.
- **Respect the column** — don't add a `max-width` to a page-level container that competes with `.site-strip`. The column is set; pages live inside it.
- **Use the breakpoint ladder consistently** — when adding a `@media` rule, use the values from the ladder above. Don't invent new breakpoints.

A page that needs structural changes at a viewport (e.g., grid collapsing from 3 cols to 1) writes a media query at one of the ladder's transition points. A page that needs a fluid response (e.g., font getting bigger on wider screens) uses a token or writes its own `clamp()` inline.

---

## Mascot/composition exceptions

A few elements deliberately scale outside the system because they're brand statements rather than layout components:

- **Home page wordmark** (`.home__wordmark`) — uses its own `clamp(48px, 11vw, 160px)` because the standard `--fs-*` tokens cap too low for hero presence.
- **Home page mascot** (`.home__mascot`) — uses its own `clamp(180px, 24vw, 380px)` to match the wordmark's scaling.
- **Peek mascot** (`PeekMascot.astro`) — has its own width prop, defaulting to a fixed 280px because it doesn't need fluid scaling.

These are intentional. When writing a new visual hero element, ask whether the standard tokens fit. If not, define inline `clamp()` rules and document why.

---

## Known issues / open questions

These are documented for future work, not actively blocking anything:

- **Mobile (≤480px) needs holistic testing.** Each page has been spot-checked but some edge cases (very narrow phones, landscape orientation) may have issues.
- **Vendors page enforces 2-column grids at all small viewports.** Other grids might benefit from the same rule. Audit during page-by-page review.
- **Past Collaborators pagination is hidden on mobile.** Decide whether other paginated elements should follow.
- **Per-page `position: relative` on PeekMascot parent containers.** Easy to forget when adding her to a new page; document in the new-route checklist.

---

## Worth knowing about CSS clamp behavior

A few things that surprised me when building this:

- **`clamp(min, ideal, max)` only "clamps" — it doesn't snap.** Between min and max, the ideal value flows continuously. If you want a stepped feel, use `@media` breakpoints.
- **The min/max can be in different units than the ideal.** `clamp(14px, calc(0.5vw + 12px), 17px)` mixes px (anchors) and vw (scaling), which is the whole point.
- **Negative results are possible.** `clamp(0, -1vw, 100px)` evaluates to `max(0, min(-1vw, 100px))` which can be weird at certain viewports. Always make sure your min ≥ 0 unless you intend otherwise.
- **`vw` includes scrollbar width.** On Windows desktop browsers with vertical scrollbars, `100vw` is slightly wider than the visible viewport. Usually doesn't matter, but if you see horizontal scroll appear unexpectedly, this is often why.