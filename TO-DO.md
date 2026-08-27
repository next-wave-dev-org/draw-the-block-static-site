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
>   **Not locally verifiable** — `astro preview` has no Netlify runtime and 404s
>   that path; the before/after Lighthouse baseline must be captured on the
>   Netlify **deploy preview** for this branch, not `npm run preview`.
> - **Follow-up spotted:** the site background image (`untitled_design_-_2026-06-23…png`,
>   ~945KB, `background.json`) is a full-screen `fixed` image on every page and a
>   bigger real cost than `dtb.jpg` — it was under the 1MB batch threshold. Worth
>   the same `/.netlify/images` treatment.

1. **Swap `dtb.jpg` to the Netlify Image CDN and take a real baseline** — it's the header banner backdrop (`BaseLayout.astro`, `.logo-backdrop`), loads on every page, and is built from a CMS string already, so `/.netlify/images?url=...` drops in with no other code changes. Capture a `npm run build && npm run preview` Lighthouse run before/after — the two `astro dev` reports currently in the repo root are dev-server-inflated and not valid baselines.
2. **Bulk-recompress the ~29 other images over 1MB in `public/uploads`** — same format/extension only (JPEG→JPEG, PNG→PNG, ~q80, cap max dimension ~2000px). All are confirmed actively referenced in content, not orphaned. Do not convert to WebP — that changes the extension and means rewriting every content path, which is a separate migration.
3. **Tighten CMS upload guardrails in `public/admin/config.yml`** — the logo-backdrop image field currently caps at 6MB, which is exactly what let a 2.85MB `dtb.jpg` through. Lower ceilings site-wide so this doesn't recur.

4. **additional ask from client** Client asked for mascot image on home to be available to be swapped with uploaded images. We should add another CMS upload section, but we need to make sure the image size is static to preseve the current aestetic and not allow an awkward home page. We can include a preview of the home page, that would be ideal.