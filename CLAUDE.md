# CLAUDE.md — Draw The Block

Behavioral contract and doc index for Claude Code. Read this file at the start of every session.

---

## Project overview

**Draw The Block** (drawtheblock.org) is a live community arts site for a Seattle organization. It is a client project headed toward handoff.

**Stack:** Astro 5 + TypeScript · Decap CMS (git-gateway + Netlify Identity) · Netlify (hosting + Functions + Identity) · Shopify Storefront API (build-time only) · Cloudflare DNS · MailerLite

**Repo:** `next-wave-dev-org/draw-the-block-static-site` (public, GitHub)

---

## System Overview

**this is an immutable Bluefin/atomic system, system packages are managed via rpm-ostree and brew, don't try to apt install or modify /usr.

## Documentation index

| Doc | What it covers |
| :-- | :-- |
| `docs/components.md` | `BaseLayout`, bracket-travel nav, `Marquee`, `Countdown`, `EventCard`, `PeekMascot`, `ProductCard`, `Breadcrumb`, `Kicker` — props, behaviors, coupling notes, new-route checklist |
| `docs/Responsive.md` | Six-step breakpoint ladder, fluid type tokens (`--fs-*`), fluid spacing tokens (`--space-*`), when to use fluid vs stepped, composition exceptions |
| `docs/shopify.md` | Storefront API integration, env var paths, mock mode, credential rotation, scope limits, troubleshooting |
| `docs/cms.md` | Decap CMS collections, field types, Netlify Identity, known limitations (subfolder media, empty-string writes), MailerLite config |
| `SESSION_STATE.md` | Live save-game state — active branch, pending tasks, completed work, deferred items |

Read the relevant doc before touching the system it covers. Do not dive into `BaseLayout.astro` cold — read `docs/components.md` first.

---

## Astro rules

- Every static page must export `export const prerender = true`.
- Use `astro:assets` `<Image>` for all static images. The site has a Lighthouse Performance score of 100 — do not regress it.
- Animated GIFs and dynamic-src assets (e.g. `PeekMascot` images) stay in `public/`, not `src/assets/`.
- Run `npx astro sync` after any content schema change before building.
- Collection entries are typed via `CollectionEntry<"collection-name">` — match existing patterns.
- Build validation gate: `npm run build` must succeed. Do not declare a task done without a clean build.
- For UI work, also run `npm run dev` and visually verify.

---

## Schema change rules

Any change to `src/content/config.ts` **must** be mirrored in `public/admin/config.yml` (Decap CMS). These two files must stay in lockstep.

- A Zod `enum` maps to a Decap `select`.
- An optional URL field must **not** be `required: true` in Decap.
- Optional date/URL fields require `z.preprocess` to convert CMS-written empty strings to `undefined` before Zod validation. See existing `optionalUrlField` helper.
- Data collections (non-content) use plain YAML — no frontmatter delimiters. Use `extension: "yaml"` and `format: "yaml"` in `config.yml`.

---

## CSS rules

- All spacing must use `--space-*` tokens from `tokens.css`. Do not hardcode pixel values for margins, padding, or gaps.
- All font sizes must use `--fs-*` tokens. Component-specific display sizes may define inline `clamp()` — document why if you do.
- New media queries must use the six-step breakpoint ladder from `docs/Responsive.md`. Do not invent new breakpoints.
- Hover effects must be scoped to `@media (hover: hover)` to prevent mobile hover-stuck bugs.
- `BaseLayout.astro` owns the body background exclusively. Do not add competing background rules to `base.css`.
- Do not add a `max-width` to page-level containers that competes with `.site-strip`. The column max-width is set by `.site-strip` in `base.css`.

---

## TypeScript rules

- Strict types throughout. Do not use `any` unless no other option exists.
- Match the `CollectionEntry<"name">` typing pattern used across existing pages.
- No project-wide formatter is enforced — match surrounding style, do not reformat unrelated lines.

---

## Component coupling notes

- **Adding a new top-level route:** follow the checklist in `docs/components.md` — it covers `NavKey`, `MarqueeScope`, `navItems`, marquee schema, Decap config, `npx astro sync`, and PeekMascot CMS steps. All of those edits must happen together.
- **`EventCard` and `ProductCard` share hover behavior.** If you change one, check the other.
- **`BaseLayout.astro`'s bracket-travel JS** is subtle — `ResizeObserver`, `astro:page-load`/`astro:before-swap` lifecycle, WeakMap listener tracking. Do not touch it unless the task explicitly requires it. If you must, read `docs/components.md` first.
- **`MarqueeScope` / `marquee.json` / Decap CMS config** are three-way coupled. A new scope requires edits to all three.

---

## What not to do

- Do not commit `.env`, `SHOPIFY_STOREFRONT_TOKEN`, MailerLite API tokens, or `src/content/` edits made to test schemas.
- Do not attempt Decap media subfolder organisation. Decap's media picker does not support subfolder browsing regardless of `media_folder` config. Flat `public/uploads/` is the permanent state.
- Do not expand Shopify integration beyond read-only product display (cart, variants, checkout) without explicit scope approval — see `docs/shopify.md`.
- Do not use `sed -i ''` for file edits in this environment (fails in Git Bash on Windows). Use Python `pathlib.Path.read_text()` / `.write_text(encoding="utf-8")` for reliable cross-platform file manipulation.

---

## Environment variables

| Variable | Used by |
| :-- | :-- |
| `SHOPIFY_STOREFRONT_TOKEN` | `src/lib/shopify.ts` — Storefront API auth |
| `SHOPIFY_STORE_DOMAIN` | `src/lib/shopify.ts` — store hostname |
| `SHOPIFY_USE_MOCKS` | `src/lib/shopify.ts` — set `true` to use fixture data in dev |
| `MAILERLITE_API_KEY` | Netlify Function — newsletter subscribe endpoint |
| `MAILERLITE_GROUP_ID` | Netlify Function — subscriber group target |

All secrets live in Netlify environment variables in production. Local dev uses `.env` (never committed).

---