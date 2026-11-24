# SEO & Google Search Console

## What the site emits

| Piece | Where |
|---|---|
| `<title>`, meta description, canonical, Open Graph, Twitter card | `src/layouts/BaseLayout.astro` (every page except `/`) and the head block in `src/pages/index.astro` (landing page) |
| Description cleanup (strip markdown, ~160 chars, fallback to site description) | `cleanDescription()` in `src/lib/seo.ts` |
| Canonical URLs | `canonicalUrl()` — always `https://drawtheblock.org/<path>/` **with trailing slash** (Netlify 301s `/home` → `/home/`) |
| Organization + WebSite JSON-LD | `/` and `/home/` |
| Event JSON-LD | `events/[slug].astro` and `events/[eventSlug]/[subSlug].astro`, via `eventJsonLd()`. Only emitted when title, start date **and location** all exist. `startDate`/`endDate` carry the Pacific offset (`America/Los_Angeles`). `endTime` ("6 PM") is combined with the start date |
| `noindex` | `<BaseLayout noindex>` — used on `/thank-you` |
| Sitemap | `@astrojs/sitemap` → `/sitemap-index.xml` → `/sitemap-0.xml`. Excludes `/thank-you`, `/admin`, `/api` (see `astro.config.mjs`) |
| `robots.txt` | `public/robots.txt` — allows everything, disallows `/admin/` and `/api/`, points at the sitemap |
| Default share image | `public/images/og-default.png` (1200×630, logo on black). Event pages use their own `image` |

Rules:
- `site` in `astro.config.mjs` is the **apex** (`drawtheblock.org`); `www` 301s to it. Don't change one without the other.
- A page you want `noindex`ed must **not** also be `Disallow`ed in `robots.txt` — Google has to crawl it to see the tag.
- New CMS event pages get sitemap entries and JSON-LD automatically on the next build. Fill in **Location** or Google won't get Event markup.
- Titles are intentionally unchanged (all-caps brand style). Changing them is a visible tweak — do it deliberately.

## Google setup (one time, ~20 minutes)

Google only finds a site it has been told about or that other sites link to. A new/low-link domain can sit unindexed for weeks. Do these in order after the SEO PR is live on `drawtheblock.org`.

### 1. Verify ownership in Search Console
1. Sign in at <https://search.google.com/search-console> with the Google account the client wants to own this (the shared `drawtheblock` Gmail is a good choice; add yourself as a user later).
2. **Add property → Domain** (not "URL prefix"). Enter `drawtheblock.org`.
3. Google shows a `TXT` record (`google-site-verification=...`). Copy it.
4. DNS is on **Cloudflare** (`elle.ns.cloudflare.com` / `maciej.ns.cloudflare.com`). In Cloudflare → `drawtheblock.org` → **DNS → Records → Add record**: Type `TXT`, Name `@`, Content = the string Google gave you. Save.
5. Back in Search Console click **Verify** (DNS can take a few minutes; retry if it fails).
   - Don't delete the TXT record afterwards — Google re-checks it.

### 2. Submit the sitemap
Search Console → **Sitemaps** → enter `sitemap-index.xml` → Submit. Status should become *Success* and discover ~26 pages.

### 3. Ask Google to index the key pages
Search Console → top search bar → **URL Inspection**, paste each URL, then **Request indexing**:
- `https://drawtheblock.org/`
- `https://drawtheblock.org/home/`
- `https://drawtheblock.org/events/`
- the current event page

(Limited to a handful per day. If it says "URL is on Google" you're already indexed.)

### 4. Check the structured data
- Rich Results Test: <https://search.google.com/test/rich-results> → paste an event URL → it should detect **Event** with no errors.
- Search Console → **Enhancements → Events** appears once Google has processed the pages.

### 5. Get linked (matters more than any tag)
Google trusts a domain that others link to. Put `https://drawtheblock.org` in:
- the **Carrd page** (`drawtheblock.carrd.co`) — it currently outranks the real site for the brand name; add a prominent link, and ideally redirect it to the main site once the new site is indexed,
- the Instagram bio (`@drawtheblock.sea`), Discord, Eventeny listing, vendor/partner pages, and any press or event listing sites.

### 6. What to expect / how to check
- Indexing typically takes days to a few weeks. Search Console → **Pages** shows indexed vs. excluded pages with reasons.
- Test with `site:drawtheblock.org` in Google (works in a normal Google search).
- Brand-name ranking against the Carrd page and unrelated "Draw the Block" results takes longer than indexing.

## Verifying locally

```bash
SHOPIFY_USE_MOCKS=true npm run build
# then inspect dist/index.html, dist/home/index.html, dist/events/<slug>/index.html,
# dist/sitemap-0.xml, dist/robots.txt
npx netlify-cli@latest serve --offline   # production-like serve at :8888
```

> **Warning:** `netlify serve` injects your local `.env` (Shopify + **MailerLite** keys) even with `--offline`.
> Form endpoints (`/api/subscribe`) hit the **real** services, and `/api/trigger-deploy` would
> trigger a **real** build. Don't POST to them while testing — or run with an empty env.
>
> Also: the local server resizes images but doesn't convert to webp, and it ignores the
> `/uploads/*` `Cache-Control` rule from `netlify.toml`. Verify those on the deployed site with
> `curl -I https://drawtheblock.org/uploads/dtb.jpg` and
> `curl -H "Accept: image/webp" -I "https://drawtheblock.org/.netlify/images?url=%2Fuploads%2Fdtb.jpg&w=1920&q=70"`.
