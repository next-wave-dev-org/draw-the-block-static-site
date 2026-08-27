# TO-DO

## Performance: CMS-uploaded images are the main slow-load culprit

### 8/26/2026

> **Status (branch `performance-update`, applied 8/27/2026):** items 1–3 applied.
> Order run was 3 → 2 → 1 (safest/most-verifiable first).
> - **Item 2:** 29 files recompressed in place, `public/uploads` 88MB → 46MB. EXIF
>   orientation baked in (`.rotate()` before resize); transparency verified
>   preserved on the alpha PNGs. Script kept in the session scratchpad, not committed.
> - **Item 3:** caps + matching hint text lowered together in `config.yml`
>   (backdrop 6MB→1.5MB, background 6MB→3MB, event/subevent/poster 4MB→2.5MB,
>   custom logo 2MB→1MB, tagline 2MB→1.5MB, team 1MB→750KB). No `config.ts` /
>   `astro sync` change — not a schema edit.
> - **Item 1:** `dtb.jpg` now routed through `/.netlify/images` (w=1920, q=70, no
>   `fm` so Netlify content-negotiates webp/avif; on-disk file untouched).
>   `astro dev` serves the raw file (`import.meta.env.DEV` guard). **Verified
>   against production**: `GET /.netlify/images?url=%2Fuploads%2Fdtb.jpg&w=1920&q=70`
>   with a webp `Accept` returns `image/webp` at 262KB vs the 2.84MB origin
>   (−91%); `Cache-Status: "Netlify Edge" … stored`. Full-page Lighthouse
>   before/after still wants a Netlify deploy preview (see CI note below).
> - **Cache headers (added to this branch):** `netlify.toml` now sets
>   `Cache-Control: public, max-age=604800, stale-while-revalidate=86400` on
>   `/uploads/*`. Netlify's default there was `max-age=0, must-revalidate` — a
>   conditional round trip per repeat view. Confirmed against production that the
>   `/.netlify/images` transform inherits the source `Cache-Control`, so this
>   covers the CDN variants too. Repo history shows no client same-filename image
>   swaps, so a week is safe. **Note:** cold Lighthouse won't reflect this — it's
>   a repeat-view / return-visitor win, not first paint.
> - **CI note:** the Netlify deploy preview did not build for PR #105 (targets
>   `develop`; Netlify Deploy Previews are likely scoped to PRs against `main`).
>   A Cloudflare Pages preview *did* build from an external repo integration —
>   ignore it, this project has no Cloudflare config and `/.netlify/*` 404s there.
> - **Follow-up still open (not in this branch):** the site background image
>   (`untitled_design_-_2026-06-23…png`, ~945KB, `background.json`) is a
>   full-screen `fixed` image on every page — bigger real cost than `dtb.jpg`,
>   just under the 1MB batch threshold. Same `netlifyImage()` helper, one line.

1. **Swap `dtb.jpg` to the Netlify Image CDN and take a real baseline** — it's the header banner backdrop (`BaseLayout.astro`, `.logo-backdrop`), loads on every page, and is built from a CMS string already, so `/.netlify/images?url=...` drops in with no other code changes. Capture a `npm run build && npm run preview` Lighthouse run before/after — the two `astro dev` reports currently in the repo root are dev-server-inflated and not valid baselines.
2. **Bulk-recompress the ~29 other images over 1MB in `public/uploads`** — same format/extension only (JPEG→JPEG, PNG→PNG, ~q80, cap max dimension ~2000px). All are confirmed actively referenced in content, not orphaned. Do not convert to WebP — that changes the extension and means rewriting every content path, which is a separate migration.
3. **Tighten CMS upload guardrails in `public/admin/config.yml`** — the logo-backdrop image field currently caps at 6MB, which is exactly what let a 2.85MB `dtb.jpg` through. Lower ceilings site-wide so this doesn't recur.

4. **additional ask from client** Client asked for mascot image on home to be available to be swapped with uploaded images. We should add another CMS upload section, but we need to make sure the image size is static to preseve the current aestetic and not allow an awkward home page. We can include a preview of the home page, that would be ideal.