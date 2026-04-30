# Components

A reference for the shared components in `src/components/`, the layout that wraps every page, and the small data-layer helper for the shop. Page-level files (`home.astro`, `events/index.astro`, `support.astro`, etc.) consume these but aren't documented here.

The audience for this doc is whoever picks up the codebase next — not the client editing content. If you're looking for "how does the CMS work," see the relevant section in the main README.

---

## BaseLayout

**Path:** `src/layouts/BaseLayout.astro`

Wraps every page. Owns the site chrome — logo, primary nav, marquee band, content slot, footer — plus the marquee resolution logic and the bracket-travel nav indicator. This file is the most complex piece in the codebase; touch it carefully.

### Props

| Prop      | Type     | Default            | Description                                                                |
| :-------- | :------- | :----------------- | :------------------------------------------------------------------------- |
| `title`   | `string` | `"DRAW THE BLOCK"` | Browser tab title.                                                         |
| `current` | `NavKey` | `undefined`        | Which nav item is the active page. Drives bracket-travel + marquee scope.  |

`NavKey` is a union: `"home" | "about" | "events" | "vendors" | "shop" | "support" | "faq" | "newsletter"`. Add new keys here when you add a new top-level route.

### Bracket-travel nav

Two floating bracket glyphs (`[` and `]`) hug the active nav link at rest. On hover, they slide to whichever link the user is pointing at. On mouseleave of the entire nav, they return to the active link. 300ms cubic-bezier swoosh.

The implementation is JS-driven because variable link widths and responsive layouts can't be solved with pure CSS. Key details a future developer needs to know:

- The two `<span>` brackets are absolutely positioned inside `.strip-nav` (which is `position: relative`). JS sets `--bt-x` and `--bt-y` custom properties; CSS converts those to `transform: translate3d(...)`.
- Transform animation is GPU-accelerated and doesn't trigger layout, which keeps the swoosh smooth.
- A `ResizeObserver` on the nav re-measures whenever the container resizes (window resize, font load, responsive reflow). Without this, the brackets would stick to stale positions after layout shifts.
- The first placement on each page load is **instant**, not animated. We disable the transition before placing the brackets, force a reflow with `void offsetWidth`, then restore the transition. This prevents the "shoot in from the right" effect that would otherwise happen on every page load.
- Listeners are bound on `astro:page-load` (fires on full load *and* every client-side navigation) and torn down on `astro:before-swap`. Without this, navigation via `<ClientRouter>` would leave dead listeners and stale measurements behind.
- A WeakMap tracks per-nav state so re-initializing one nav doesn't stack listeners.
- `--bt-y-nudge` is exposed as a manual CSS knob for fine-tuning vertical alignment if a specific webfont sits a pixel off after load. Currently `0px`.

### Marquee resolution

The marquee band below the nav is conditionally rendered based on a small fallback chain. All marquee config lives in `src/content/marqueeSettings/marquee.json` with one nested object per scope (`global`, `home`, `about`, `events`, `vendors`, `support`, `faq`).

The rules:

1. If the current page's scope has `enabled: true` and at least one message → show those messages.
2. If the current page's scope has `enabled: true` but **no messages** → show nothing. Treat this as the client explicitly silencing the marquee on this page; do **not** fall back to global.
3. Otherwise (override missing or disabled) → fall back to global.
4. If global is disabled or empty → render nothing.

The "enabled with empty messages = explicit silence" rule is intentional. Without it, the only way to hide the marquee on one page would be to delete the override file. With it, the client gets a clean toggle in the CMS.

`current === "newsletter"` falls through to global because newsletter is a footer link, not a top-level page with its own marquee scope.

### Footer nav

The footer keeps the older `[BRACKETS]`-around-active-label pattern via the `footerNavLabel()` helper. Bracket-travel is intentionally *not* applied here — it's a header showpiece, applying it twice would dilute it, and the lowercase footer text would look odd with floating brackets.

### Misc structural details

- The DTB logo at the top has `transition:persist` so it stays mounted across client-side navigations. Avoids a logo flicker on every page change.
- The footer's discord and instagram links read from the `settings/social` content entry. Both gracefully default to `#` if unset.
- Global, tokens, and base CSS are imported at the top — every page gets these via the layout.

---

## Marquee

**Path:** `src/components/Marquee.astro`

Horizontal scrolling announcement band. Pure CSS animation, no JS. Rendered conditionally by BaseLayout based on the resolution rules above.

### Props

| Prop       | Type       | Default | Description                                                                |
| :--------- | :--------- | :------ | :------------------------------------------------------------------------- |
| `messages` | `string[]` | `[]`    | The messages to scroll through. Component renders nothing if array is empty. |
| `speed`    | `number`   | `40`    | Seconds per full loop. Higher = slower.                                    |

### How the seamless loop works

The track contains the message list **twice**. CSS animates `transform: translateX(0)` to `translateX(-50%)` over `speed` seconds, linearly, infinitely. When the track hits `-50%`, the second copy lines up exactly where the first started. From the user's perspective, the loop is invisible.

The duplicated copy has `aria-hidden="true"` so screen readers announce each message once instead of twice.

### Other behaviors

- **Pause on hover.** `:hover` sets `animation-play-state: paused`. Lets users actually read a message that catches their eye.
- **Reduced motion.** Users with `prefers-reduced-motion: reduce` get a static, horizontally scrollable strip instead of an animation. The aria-hidden duplicate is removed in this mode (one read is enough).
- **Separator glyph.** `◉` between messages, styled smaller and dimmed via `.marquee__sep`. Easy to swap if the brand evolves.

---

## Countdown

**Path:** `src/components/Countdown.astro`

Renders a "WW:DD" countdown to a target ISO timestamp. Used on the home page to count down to the featured event.

### Props

| Prop        | Type     | Description                                                       |
| :---------- | :------- | :---------------------------------------------------------------- |
| `targetIso` | `string` | ISO 8601 timestamp string. Component does the math from there.    |

### ClientRouter-safe init pattern

This component used to break on every client-side navigation — countdown would render `00:00` after navigating away and coming back. The fix matters and shouldn't be re-broken by future edits:

- The script binds to `astro:page-load`, which fires on initial full page load **and** after every `<ClientRouter>` navigation. A plain IIFE at the bottom of the module would only run once per session, missing all subsequent navigations.
- A `WeakMap<HTMLElement, number>` tracks the active `setInterval` ID per countdown element. Before starting a new interval, we clear any existing one for that element. This prevents stacked intervals when re-initialized.
- On `astro:before-swap`, all running intervals are cleared before the DOM is swapped out. The new page's `astro:page-load` will re-initialize from scratch.
- Once the diff hits zero or below, the interval is cleared and the display locks at `00:00`.

The countdown markup uses `data-countdown` and `data-target` attributes so the script can find every countdown on the page without coupling to specific class names. Any element with `data-countdown` and a `data-target` ISO string and a child `[data-el="time"]` will be initialized.

### Sizing

`var(--fs-countdown)` for the time display. Define this in `tokens.css` if you want a different size than the default.

---

## EventCard

**Path:** `src/components/EventCard.astro`

The card used for event listings on `/`, `/events`, and `/events/[slug]` (subevents). Image frame → white poster strip with title → optional description → date and location meta.

### Props

| Prop          | Type       | Required | Description                                                       |
| :------------ | :--------- | :------- | :---------------------------------------------------------------- |
| `href`        | `string`   | Yes      | The card's link target.                                           |
| `title`       | `string`   | Yes      | Title shown in the white poster strip.                            |
| `image`       | `string`   | No       | URL to the hero image. Image frame omitted if not provided.       |
| `description` | `string`   | No       | Short copy shown below the poster.                                |
| `startDate`   | `Date`     | Yes      | Event start. Formatted via `toLocaleString`.                      |
| `endDate`     | `Date`     | No       | Multi-day end. Renders as ` – {endDate}` after start.             |
| `endTime`     | `string`   | No       | Same-day end (e.g. `"6:00 PM"`). Renders as ` – {endTime}`. Ignored if `endDate` is set. |
| `location`    | `string`   | No       | Location text rendered on its own line.                           |

### Why primitive props?

Events and subevents have different schemas — events have `featured`, subevents have `category` and `parentEvent`. Passing a typed entry would force the component to accept a discriminated union and narrow internally, which gets ugly fast. Primitives keep the component agnostic and let each caller build its own prop bag from whatever data shape it has.

### Hover treatment

1.02x scale + hard yellow drop shadow (top-right offset, 6px / -6px, no blur). 180ms ease-out. Pure CSS, no JS.

The shadow is fixed yellow (`#FFD400`) rather than complementary to the card's image because the client controls event imagery via the CMS — there's no reliable way to pick a complementary color we don't know in advance. Yellow is the brand's interactive accent across the site (also used on vendor section headings as link affordance and on the marquee separator), and works against any image.

`prefers-reduced-motion` users get the shadow but not the scale.

### Single-line title clamping

Titles are capped at one line via `white-space: nowrap` + `text-overflow: ellipsis`. This is paired with `min-width: 0` cascading down through `.eventCard`, `.eventLink`, `.eventPoster`, and `.eventTitle` so the truncation works inside grid layouts.

The `min-width: 0` cascade is critical. Without it, the intrinsic width of nowrap content overrides grid track sizing and pushes cards out of their lanes — exactly the bug we hit and fixed during development. If you ever rework this component, keep that cascade intact.

The link element has `title={title}` attribute so users hovering a truncated title see the full text in a native browser tooltip.

The CMS shows a 20-character soft warning hint on event and subevent title fields to encourage authors to keep titles short enough to avoid truncation. The hint is informational only — saves are not blocked.

---

## ProductCard

**Path:** `src/components/ProductCard.astro`

The card used for shop catalog items on `/shop`. Visually mirrors EventCard but pulls from a different data source (Shopify Storefront API) and has a few cosmetic differences.

### Props

| Prop      | Type      | Required | Description                                                       |
| :-------- | :-------- | :------- | :---------------------------------------------------------------- |
| `product` | `Product` | Yes      | A product object as defined in `src/lib/shopify.ts`.              |

### Differences from EventCard

- **Square image frame** (`aspect-ratio: 1 / 1`) instead of 16:9. Better for product photography than landscape.
- **Title clamps to 2 lines** via `-webkit-line-clamp: 2` instead of EventCard's single-line nowrap. Product titles from Shopify can't be enforced via CMS validation — the client manages them in their Shopify admin — so we accept that some will run long and use a 2-line clamp with an ellipsis as the safety net. Title attribute on the link still gives a native tooltip for the full text.
- **Sold-out badge** in the top-right corner of the image frame when `availableForSale === false`. Small yellow chip, no other treatment. Card stays fully clickable; users may want to read the product page even when it's currently out of stock.
- **Price line below the title** in the white poster strip. Formatted via `formatPrice()` from the shopify lib.
- **Opens in a new tab** via `target="_blank" rel="noopener noreferrer"`. EventCard navigates within the site; ProductCard always sends users to the external Shopify-hosted product page.

The hover treatment is otherwise identical — same scale, same shadow, same timing. They're meant to feel like siblings.

---

## Breadcrumb

**Path:** `src/components/Breadcrumb.astro`

Hierarchical orientation strip used at the top of detail pages. Replaces the older "Back to X" floating link + horizontal divider pattern.

### Props

| Prop    | Type               | Description                                                                                |
| :------ | :----------------- | :----------------------------------------------------------------------------------------- |
| `items` | `BreadcrumbItem[]` | Ordered list of segments rendered with slash separators.                                   |

```ts
interface BreadcrumbItem {
  label: string;
  href?: string;
}
```

Items with `href` render as links; items without render as the current page (with `aria-current="page"`).

### Usage examples

Two-segment, on `/events/[slug]`:

```astro
<Breadcrumb items={[
  { label: "EVENTS", href: "/events" },
  { label: event.data.title.toUpperCase() }
]} />
```

Three-segment, on `/events/[eventSlug]/[subSlug]`:

```astro
<Breadcrumb items={[
  { label: "EVENTS", href: "/events" },
  { label: parent.data.title.toUpperCase(), href: `/events/${parent.slug}` },
  { label: subevent.data.title.toUpperCase() }
]} />
```

### Visual style

Tight uppercase, smaller font (11px) than kickers, slash separators with breathing room. Links have a 150ms hover-fade from 85% → 100% opacity plus an underline-on-hover. Current-page segments are dimmed to 60% opacity — links visually anchor stronger than the "you are here" indicator, which matches how breadcrumbs work everywhere else.

The component uses `<nav>` + `<ol>` semantics with `aria-label="Breadcrumb"` so screen readers announce it correctly.

### Wrapping

`flex-wrap: wrap` on the list lets very long breadcrumbs wrap to multiple lines on narrow viewports. If you want truncation (ellipsis on middle segments) instead, that's a future enhancement — not implemented today.

---

---

## PeekMascot

**Path:** `src/components/PeekMascot.astro`

A decorative mascot character that peeks from the side band of a
page, her hand resting on the central column edge. Currently used
on the about, events detail, and vendors pages.

### Props

| Prop      | Type                       | Default                                  | Description                                                                                                                |
| :-------- | :------------------------- | :--------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| `src`     | `string`                   | `"/images/mascot_peek_${side}.png"`      | Path to the mascot asset. Defaults to the side-appropriate file. Override only when using a custom variant.                |
| `side`    | `"left" \| "right"`        | `"left"`                                 | Which side band the mascot peeks from. Picks the matching asset by default — left → `mascot_peek_left.png`, right → `mascot_peek_right.png`. |
| `width`   | `string` (CSS length)      | `"280px"`                                | Rendered width.                                                                                                            |
| `offset`  | `string` (CSS length or %) | per-side breakpoint default              | How much of the asset tucks behind the parent's edge to align her hand. Defaults differ by side because each asset's hand sits at a different frame position. |
| `bottom`  | `string` (CSS length)      | `"80px"`                                 | Distance from the bottom of the parent container.                                                                          |
| `mirror`  | `boolean`                  | `false`                                  | Force a horizontal flip via `scaleX(-1)`. Used when you want the wrong-side asset on a side as a fallback.                 |

### Required parent setup

The mascot is absolutely positioned. **The parent container must have
`position: relative`** for it to anchor correctly. This is non-optional
— without it, she'll position relative to the document body or
viewport instead of the page's content column.

### How the side variants work

There are two distinct hand-drawn assets, one for each side:

- `mascot_peek_left.png` — character peeks from the left side band,
  hand reaching to the right.
- `mascot_peek_right.png` — character peeks from the right side band,
  hand reaching to the left.

Setting `side` picks both the position AND the asset:

```astro
<PeekMascot side="left" />   {/* → uses mascot_peek_left.png  */}
<PeekMascot side="right" />  {/* → uses mascot_peek_right.png */}
```

No mirroring happens by default — each asset is already drawn
correctly for its side. The `mirror` prop is a fallback for the
edge case where you want to force one asset onto the wrong side
(e.g. only the left asset is available but the design calls for a
right-side appearance):

```astro
<PeekMascot side="right" mirror src="/images/mascot_peek_left.png" />
```

Per-side offset defaults: each asset has its hand drawn at a
different position within its frame, so the `--peek-offset-default-left`
and `--peek-offset-default-right` CSS variables are tuned independently
inside the component. If you swap an asset, expect to re-tune the
matching side's defaults.

```astro
<PeekMascot src="/images/mascot_peek_right.png" side="right" />
```

The `side="right"` is still needed — it tells the component to anchor
to the parent's right edge instead of the left.

### Tuning per page

Each page has different content height and visual context. Default
values match the about page, but other pages will likely need overrides:

```astro
{/* About — original tuning */}
<PeekMascot offset="15%" />

{/* Events detail — content runs deep, lift her up */}
<PeekMascot bottom="120px" />

{/* Vendors — clear the application section at the bottom */}
<PeekMascot bottom="200px" offset="29%" />
```

The `offset` value differs across pages because each parent container
has a different width and position. The percentage is calculated from
the mascot's own width, but the visual anchor depends on parent
geometry — so tuning per page is expected.

### Hidden on narrow viewports

The mascot is `display: none` below 960px. At smaller viewports, the
side band space disappears and she'd overflow the viewport edge or
overlap content. The breakpoint is hardcoded in the component; if
you ever want a per-page exception, that's a one-line override in
the page's CSS:

```css
@media (max-width: 960px) {
  .your-page .peek {
    display: block;  /* override the component's hide rule */
  }
}
```

But generally, the hide-below-960px rule is what you want.

### Variant support

The component supports asset variants beyond the two side-default
assets. Likely scenarios:

1. **Different expressions** (smiling, thinking, etc.) — pass via `src`,
   keep `side` matching the position you want.
2. **Different mascot character** for a specific page — pass via `src`.
3. **Forced wrong-side use** (e.g. only have the left asset, need a
   right-side appearance) — pass `mirror` plus an explicit `src`.

The CSS variables (`--peek-width`, `--peek-offset`, `--peek-bottom`)
are set inline from props, so each instance is fully independent.
No global state, no coordination between instances.

---

## Shopify Integration

The `/shop` page pulls products from the client's Shopify store at
build time using the Storefront API. No backend, no runtime
dependencies — the product list is baked into the static HTML on
each deploy.

For everything else — environment variables, credential acquisition,
webhook setup, credential rotation, troubleshooting — see
[`docs/shopify.md`](docs/shopify.md).

If `/shop` shows mock products instead of real ones, your `.env` is
either missing or `SHOPIFY_USE_MOCKS=true` is set. Drop in real
credentials and restart the dev server.

### Image URLs

Shopify CDN supports a `?width=N` query param that returns a server-side resized image. `sizedImageUrl(url, 600)` appends this. ProductCard uses 600px (covers retina at 300px display) instead of loading whatever original size the client uploaded. Saves bandwidth on every shop view.

### Price formatting

`formatPrice(25, "USD")` returns `"$25"`. `formatPrice(25.50, "USD")` returns `"$25.50"`. Built on `Intl.NumberFormat` with `en-US` locale hardcoded. If the client ever expands beyond US currency, thread locale through as a parameter — don't try to guess from the user's browser, that introduces inconsistency between SSR and runtime.

### Product detail URLs

The `Product.url` field prefers Shopify's `onlineStoreUrl` (which respects custom vanity domains if the client sets one up) and falls back to constructing `https://{domain}/products/{handle}`. Both work; the fallback only matters if `onlineStoreUrl` is null, which happens when a product isn't published to the Online Store sales channel.

### What's not here

Cart UI, product detail pages on this site, filtering, variants, real-time inventory, customer accounts, discount codes — none of this exists today. v1 scope was deliberately minimal: list products, link to Shopify for everything else. If the scope expands, that's where new code lives.

---

## Tying it together

The components above don't exist in isolation. A few worth knowing about together:

- **EventCard and ProductCard are intentionally siblings.** They look the same on hover, share the yellow accent, and appear in the same grid pattern across pages. If you change the hover on one, change both — there's a comment in ProductCard's CSS reminding future-you of this.
- **PeekMascot appears on multiple pages with shared logic.** About, events detail, and vendors all use the same component with per-page prop overrides. If you ever change the breakpoint, sizing math, or per-side offset defaults, the change is component-local and applies everywhere. The home page does NOT use PeekMascot — its mascot is part of a larger composition with the DRAW/THE/BLOCK wordmark and lives directly in `home.astro`.
- **BaseLayout's marquee resolution and the Marquee component are tightly coupled but the seam is clean.** Marquee just renders a list of strings. BaseLayout decides which list to pass. New scopes (e.g. "shop") would require editing `MarqueeScope` in BaseLayout *and* the schema in `config.ts` *and* the Decap CMS config in `public/admin/config.yml`. Three coordinated edits — keep them in lockstep.
- **Breadcrumb and EventCard are layout siblings.** Breadcrumb sits at the top of detail pages where EventCard appears at the top of list pages. They're visual peers in a hierarchy.

If you're adding a new top-level route, the checklist is roughly:

1. Add the key to `NavKey` in BaseLayout.
2. Add the key to `MarqueeScope` if the page should be a per-page override target.
3. Add an entry to `navItems` in BaseLayout.
4. Add a new scope to the marquee schema in `src/content/config.ts`.
5. Add the matching scope to the Decap config (`public/admin/config.yml`) so the client can edit it.
6. Run `npx astro sync` after schema changes.