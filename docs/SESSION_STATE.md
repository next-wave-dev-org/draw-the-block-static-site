# SESSION_STATE.md — Draw The Block

Live "save game" state. Read at the start of every session per `AGENT.md` §III. Update on every handoff trigger.
 
---

## ⚠️ TOP PRIORITY — Resume here next session

### A) Dependency upgrade — Astro 5 → 7 (staged, agreed plan)

Branch: `89-upgrade-depencies` (already exists, is the active branch)

**Current versions:**
- `astro`: 5.16.6 → target 7.0.2 (two major versions)
- `@astrojs/netlify`: 6.6.5 → target 8.0.0 (must match Astro major)
- `decap-server`: 3.5.0 → target 3.9.1 (low risk, do anytime)

**Agreed approach: two stages. Do NOT attempt a one-shot jump.**

---

#### Stage 1 — Astro 5 → 6, netlify 6 → 7 (do this first)

`npm install astro@^6 @astrojs/netlify@^7`

**Required code changes — all must be done together before building:**

1. **Content Layer migration (biggest change — why it broke before)**
   - Move `src/content/config.ts` → `src/content.config.ts` (one level up, inside `src/` but NOT inside `src/content/`)
   - Add `import { glob } from "astro/loaders"` at the top
   - Add a `loader` property to every collection. Pattern:
     - `type: "content"` collections (events, subevents, vendors, neighbors, faq, sponsor, donate): `loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/<name>" })`
     - `type: "data"` collections (team, settings, vendorSettings, marqueeSettings, pageContent, peekSettings): `loader: glob({ pattern: "**/*.{json,yaml}", base: "./src/content/<name>" })`
   - Remove the `type` property from each collection (it's replaced by the loader)
   - The `id` values remain slug-based (extension stripped), so existing `getEntry()` calls should still work

2. **Fix `.render()` calls — 4 files affected:**
   - Add `render` to the import: `import { getCollection, render } from "astro:content"`
   - Replace `const { Content } = await entry.render()` with `const { Content } = await render(entry)`
   - Files: `src/pages/faq.astro:18`, `src/pages/events/[slug].astro:22`, `src/pages/partners.astro:34`, `src/pages/events/[eventSlug]/[subSlug].astro:35`

3. **Fix adapter import in `astro.config.mjs`:**
   - Change `import netlify from '@astrojs/netlify/functions'` → `import netlify from '@astrojs/netlify'`
   - The `/functions` subpath export is gone in v7+

4. **Check `SHOPIFY_USE_MOCKS` env var** (`src/lib/shopify.ts`): Astro 6 no longer coerces `"true"` strings to booleans in `import.meta.env`. If the code does `if (import.meta.env.SHOPIFY_USE_MOCKS)` that still works (truthy string). If it does `=== true`, it breaks. Verify and fix if needed.

5. **Zod 4 ships with Astro 6.** Our schema uses `z.preprocess()` and `.pipe()` — these are deprecated in Zod 4 but should still work. If the build throws Zod errors, the fix is:
   - Replace `z.preprocess((val) => ..., schema)` with `z.transform((val) => ...).pipe(schema)` or use `z.string().transform()` directly
   - The `optionalUrlField` and `requiredUrlField` helpers in `src/content.config.ts` are the most likely candidates

6. **Run `npx astro sync` after config move**, then `npm run build`

---

#### Stage 2 — Astro 6 → 7, netlify 7 → 8 (after Stage 1 is green)

`npm install astro@^7 @astrojs/netlify@^8`

**Required code changes:**

1. **Rust compiler — strict HTML validity**: The new compiler does not auto-correct invalid HTML. Run `npm run build` and fix any "unclosed tag" errors in `.astro` files.

2. **Sätteri markdown processor**: Replaces remark/rehype as the default. We have no custom remark/rehype plugins (confirmed from `astro.config.mjs`), so default rendering should still work. Watch for any subtle markdown output differences.

3. **`compressHTML` default changed** to `'jsx'` mode (strips whitespace between inline elements). If any text runs look wrong, add `compressHTML: true` to `astro.config.mjs` to restore previous behavior.

4. **Remove any experimental flags** that were stabilized: `logger`, `queuedRendering`, `rustCompiler`, `advancedRouting`, `cache` — remove from config if present (currently none in our config).

5. Run `npm run build` and visually verify.

---

### B) Docs update — still pending from previous session

**Open GitHub issue: Update `docs/components.md` to reflect all changes shipped in `feat/mailerlite-mascot-favicon` and `feat/dtb-neighbors`.**

Docs-only. No code changes. Branch: `docs/component-cms-updates`.

`docs/cms.md` is already fully up to date. Only `components.md` needs work.

#### Exact changes needed in `components.md`

**BaseLayout section:**
- `NavKey` union type description is missing `partners` — currently lists `"home" | "about" | "events" | "vendors" | "shop" | "support" | "faq" | "newsletter"`
- Marquee scope list in the resolution rules section is missing `partners` — currently lists `global, home, about, events, vendors, support, faq`
- `MarqueeScope` union type needs `partners` added

**PeekMascot section — full rewrite needed:**
- Currently describes the old props-driven pattern (`src`, `side`, `bottom`, `offset`, `width` props passed per page)
- PeekMascot is now CMS-driven. The actual usage pattern is:
    - Each page passes `peekKey="<key>"` to `<BaseLayout>`
    - BaseLayout reads `peekSettings` collection (single `peek-settings.json` entry), indexes by `peekKey`, and passes the result down to `<PeekMascot>`
    - The `<PeekMascot>` component itself is unchanged — it still accepts `src`, `side`, `bottom`, `offset` props
    - But pages no longer set those props directly — all per-page config lives in the CMS
    - Asset naming convention: `peek_{variant}_{side}.png` in `public/images/`
    - BaseLayout assembles the asset path from `peekVariant` + `peekSide` values at runtime
    - Pages with peek support: home, about, eventsHome, eventsDetail, eventsSubevent, eventsArchive, vendors, partners, shop, faq, support, newsletter
- The "Tuning per page" and "Variant support" subsections should be updated to reflect that tuning now happens in the CMS, not in page-level Astro props

**"Tying it together" section:**
- The PeekMascot paragraph says "About, events detail, and vendors all use the same component with per-page prop overrides" — update to reflect CMS-driven config across all peek-enabled pages
- Note that the home page mascot is still a special case (part of the larger composition in `home.astro`, not using `peekKey`)

**"Adding a new top-level route" checklist — add peek step:**
Currently ends at step 6. Add:
- Step 7: Add a key to the `peekSettings` schema in `src/content/config.ts`
- Step 8: Seed a disabled entry in `src/content/peekSettings/peek-settings.json`
- Step 9: Add a matching collapsible object under the Peek Mascot entry in `public/admin/config.yml`
- Step 10: Pass `peekKey="<key>"` to `<BaseLayout>` in the new page

---

- **Last Updated:** 2026-06-24
- **Active feature branch:** `89-upgrade-depencies`
- **Next action:** Start Stage 1 of the Astro upgrade (Section A above)
- **Site status:** Live at drawtheblock.org. CMS functional, deploys green, real Shopify products rendering. MailerLite confirmed working by client. Partners page live at `/partners`.
---
