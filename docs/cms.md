# CMS Architecture

The site uses [Decap CMS](https://decapcms.org/) (formerly Netlify CMS), a Git-based headless CMS. The client edits content through a static admin UI; saves commit directly to the GitHub repo via Git Gateway; Netlify rebuilds; the site updates.

This document covers the architecture, the operational decisions, and the things that aren't obvious from reading `public/admin/config.yml` alone. For the canonical list of fields and collections, read `config.yml` directly — it's the source of truth.

---

## How it fits together

Three pieces, kept in sync manually:

1. **`public/admin/config.yml`** — defines what the client sees in the admin UI. Collections, fields, widget types, validation, hints.
2. **`src/content/config.ts`** — Astro content-collection schemas (Zod). Defines the *runtime* shape the site code consumes. Build fails if content violates these.
3. **`src/content/<collection>/`** — actual markdown / YAML / JSON content files. Created and edited via the CMS, but also editable directly in the repo when needed.

When adding or changing a field, both `config.yml` (CMS-facing) and `config.ts` (runtime-facing) must be updated. They are not generated from each other. Drift between them is the most common source of subtle CMS bugs — either a field exists in the CMS but the build doesn't know about it (silently lost on read), or it exists in the schema but not the CMS (client can never set it).

Run `npx astro sync` after any change to `config.ts` to regenerate the content-collection types Astro uses for autocomplete and type-checking.

---

## Local development

Two processes need to run in parallel for local CMS work:

```
npm run dev         # Astro dev server (localhost:4321)
npx decap-server    # Local Decap proxy (localhost:8081)
```

The Decap proxy lets the admin UI at `/admin` read and write content files directly to the local filesystem, bypassing Git Gateway. Without it, the local admin UI tries to authenticate against the live backend and fails.

`local_backend: true` in `config.yml` is what activates this — Decap detects the proxy and routes through it. Leave it on; it's a no-op in production because the proxy isn't running there.

---

## Collections overview

The shape of the content model (see `config.yml` for fields):

| Collection      | Type       | Purpose                                             |
|-----------------|------------|-----------------------------------------------------|
| `events`        | folder     | Top-level events. One markdown file per event.      |
| `subevents`     | folder     | Children of events. References parent via `parentEvent` (slug). |
| `team`          | folder     | Team member profiles (YAML format, not markdown).   |
| `vendors`       | folder     | Vendors and their event associations.               |
| `faq`           | folder     | FAQ entries, manually ordered.                      |
| `sponsor`       | folder     | Singleton: sponsor page content.                    |
| `donate`        | folder     | Singleton: donate page content.                     |
| `pageContent`   | file       | Per-page content blocks: tagline, mission, quote.   |
| `settings`      | file       | Site-wide settings: social links, vendor app, marquee. |

Singletons (sponsor, donate) use `create: false` and a fixed slug so the client can edit but not duplicate them. File collections (`pageContent`, `settings`) are explicit lists rather than folders because their content is small and structurally fixed.

---

## Upload guardrails

Every `widget: "image"` field has a `media_library.config.max_file_size` cap in bytes, plus a `hint` describing recommended dimensions. Decap enforces the cap client-side at upload time — oversized files are rejected before they reach the repo. This is the only thing preventing the Lighthouse Performance 100 score from eroding as the client adds content over time.

Current limits:

| Field                          | Max   | Hint guidance                |
|--------------------------------|-------|------------------------------|
| Event / subevent featured image| 4 MB  | 1500–2500px, under 2MB       |
| Sponsor poster                 | 4 MB  | 1500–2500px, under 2MB       |
| Tagline image                  | 2 MB  | 1500–2000px, under 1MB       |
| Team photo                     | 1 MB  | 600–1000px, under 500KB      |
| Vendor logo                    | 500 KB| Square, min 400×400px        |

The pattern in `config.yml`:

```yaml
- label: "Featured Image"
  name: "image"
  widget: "image"
  required: false
  media_library:
    config:
      max_file_size: 4194304   # 4 MB in bytes
  hint: "Recommended: 1500–2500px wide, under 2MB. Max 4MB — larger files will be rejected at upload."
```

A few things worth knowing:

- **The nesting matters.** `max_file_size` must live under `media_library.config`. A flat-root `max_file_size` is silently ignored — no error, no validation. If a new image field gets added without the nesting, the limit doesn't apply. Easy to miss.
- **Bytes only.** No `4MB` string syntax. Conversions: 4MB = 4194304, 2MB = 2097152, 1MB = 1048576, 500KB = 512000.
- **The hint should mention the cap.** The hint text appears below the field; the rejection error only appears after a failed upload attempt. Including the cap in the hint sets expectations before the client tries to upload a 12MB phone photo and hits the wall.
- **Adding a new image field?** Default to the closest equivalent cap from the table above. There's no global ceiling — every field is independent.

CMS-driven images are loaded as raw `<img>` elements in the site code, not Astro's `<Image>` component, because `<Image>` requires asset imports that path strings from CMS content can't satisfy. This means upload-time validation is the only defense against oversized assets reaching production.

---

## Marquee structure

The marquee is unusual in two ways and worth flagging because it's the most complex part of the CMS:

1. **Per-page overrides.** A single file (`src/content/marqueeSettings/marquee.json`) holds a global config plus six per-page overrides (home, about, events, vendors, support, faq). Each override is its own collapsed object in the admin UI, so the client can toggle a page-specific marquee without touching global.
2. **Speed validation via regex pattern, not number widget.** The `speed` field uses `widget: "string"` with `pattern: ['^[1-9][0-9]*$', '...']` instead of `widget: "number"`. This was deliberate: the number widget allowed alphanumeric input ("abc") to save and break the marquee on the next build. The string-plus-pattern approach rejects non-integer input at save-time.

If a future page needs a marquee override, add a new per-page object alongside the existing six. Mirror the pattern exactly — Decap doesn't have a shared-anchor concept that survives well in the admin UI.

---

## Authentication and access

Production CMS access is via **Netlify Identity + Git Gateway**. Identity handles "is this person allowed to log in"; Git Gateway handles "this logged-in person can write commits to GitHub without their own GitHub credentials." The client never sees the repo directly.

When adding a new editor:
1. Netlify dashboard → Site configuration → Identity → Invite users.
2. Confirm the invite email lands and the user can click through to set a password.
3. New editor visits `/admin/`, logs in, and should see the full admin UI.

If a new editor can log in but sees no collections, the Git Gateway role is missing. Identity → Identity users → click the user → check roles. The role required is configurable in Identity settings; default is no role restriction (anyone authenticated has full access).

---

## Build / deploy flow

Every CMS save commits to `main`. Netlify watches `main` and auto-rebuilds on every push. The full cycle:

1. Client clicks Save in admin UI.
2. Decap commits to GitHub via Git Gateway. Commit message format: `Update <collection> "<title>"`.
3. Netlify webhook fires, triggers a new build.
4. Build runs `npm run build` → Astro processes content collections → outputs to `dist/`.
5. Netlify deploys `dist/`. Site updates in 1–3 minutes after Save.

**Build minutes matter.** Free Netlify tier is 300 minutes/month. Each build runs ~15 minutes. That's ~20 saves/month before the ceiling. A chatty editing session can burn through the budget fast. See REMAINING-WORK.md for the watchlist note and escalation options.

---

## Future CMS work

These are planned features that will land in `config.yml` and need accompanying updates here when they ship.

### Background art via CMS

Client wants to upload a background image (or set a solid color) via the CMS. Likely shape: a new `siteSettings` collection or entry under `pageContent` with `backgroundImage` / `backgroundColor` / `backgroundMode` fields. `BaseLayout.astro` reads the entry and injects the value into `body { background: ... }`.

Open design questions: per-page or global, image-vs-color toggle, readability overlay, mobile/desktop variants. Worth a client conversation before building.

When this lands, the new image field needs a `max_file_size` of its own — probably larger than the 4MB event cap since it's full-bleed, but still aggressively constrained. Add a row to the upload guardrails table above.

### CMS-driven Mascot Peek assignment

Library curation stays developer-side (the Peek assets are version-controlled to maintain visual consistency), but per-page assignment moves to the CMS. Each `pageContent` entry gets a `peekVariant` (select widget enumerating the library) and `peekSide` (left | right | none). Vertical position is a stretch goal.

This affects `pageContent` collection structure significantly. The shared field group pattern doesn't exist in Decap; the simplest path is duplicating the peek fields onto each `pageContent` file entry, accepting the verbosity.

### MailerLite migration

Newsletter is currently wired to Mailchimp. The migration to MailerLite is planned but not started. Note that the newsletter form itself isn't a CMS-edited piece — it's hardcoded in `src/pages/newsletter.astro`. What changes is the API endpoint and credentials, not the form.

---

## Gotchas worth knowing

These have bitten us before:

- **Empty-string dates.** Decap's datetime widget can save `endDate: ""` when the client clears the field instead of omitting it. Astro's `z.coerce.date().optional()` accepts undefined but rejects empty strings. The schema uses a `z.preprocess` to coerce empty strings to undefined. Don't remove that preprocessor when refactoring schemas.
- **Duplicate-id warnings.** Astro's glob-loader occasionally double-registers a content file on build, producing a `Duplicate id "..."` warning. Doesn't affect output. Resolution that's worked historically: delete and recreate the offending content file in the CMS. May disappear with the Astro 6 upgrade.
- **`config.yml` syntax is YAML, not JSON.** Inline-flow `{ ... }` mixed with block style is legal and the existing config uses both. When adding nested fields (like `media_library.config.max_file_size`), expand to block style — inline flow gets unreadable fast.
- **Client-saved relations use slugs, not IDs.** The `parentEvent` field on subevents stores the parent's slug as a string. If you rename a slug, every subevent that references it breaks. Treat slugs as effectively permanent once content is live.