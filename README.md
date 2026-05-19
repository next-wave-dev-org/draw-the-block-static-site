# Draw The Block

Live: [drawtheblock.org](https://drawtheblock.org)

Astro static site for Draw The Block, a Seattle-based art collective. Content is managed by the client through Decap CMS; the build pulls product data from Shopify; the whole thing deploys to Netlify on every commit to `main`.

## Stack

- **Astro 5** — static site generator, content collections, Image pipeline
- **Decap CMS** — Git-based content management, admin UI at `/admin`
- **Netlify** — hosting, build pipeline, Identity (CMS auth), Git Gateway (CMS commits)
- **Shopify Storefront API** — product catalog, fetched at build time
- **Mailchimp** *(to be replaced by MailerLite)* — newsletter signups via Netlify Function

## Prerequisites

- Node.js (LTS)
- npm
- Git

## Getting Started

```bash
git clone <repo>
cd <repo>
npm install
npm run dev
```

The dev server runs at `localhost:4321`.

For local CMS editing, run the Decap proxy in a second terminal:

```bash
npx decap-server
```

This lets `/admin` write to the local filesystem instead of going through Git Gateway. See [`docs/cms.md`](docs/cms.md) for the full CMS architecture.

## Project Structure

```
public/
├── admin/                              # Decap CMS admin UI
│   ├── config.yml                      # Collection definitions (the source of truth for CMS)
│   └── index.html
├── fonts/
├── images/                             # Static brand assets (mascot peek PNGs, eyes.gif)
└── uploads/                            # Media uploaded through the CMS

src/
├── assets/                             # Astro-processed assets (logo, mascots)
│
├── components/                         # Reusable UI components
│   ├── Breadcrumb.astro
│   ├── Countdown.astro
│   ├── EventCard.astro
│   ├── Kicker.astro
│   ├── Marquee.astro
│   ├── PeekMascot.astro
│   └── ProductCard.astro
│
├── content/                            # Astro content collections
│   ├── config.ts                       # Collection schemas (Zod)
│   ├── events/
│   ├── faq/
│   ├── marqueeSettings/
│   ├── pageContent/                    # Tagline, mission, quote
│   ├── settings/                       # Social links, vendor app, marquee
│   ├── sponsor/                        # Singleton: sponsor block on support page
│   ├── donate/                         # Singleton: donate block on support page
│   ├── subevents/
│   ├── team/
│   ├── vendors/
│   └── vendorSettings/
│
├── layouts/
│   └── BaseLayout.astro                # Site chrome: logo, nav, marquee, footer
│
├── lib/
│   └── shopify.ts                      # Shopify Storefront API client + mock fallback
│
├── pages/                              # Astro routing
│   ├── index.astro                     # Landing splash (eyes.gif → /home)
│   ├── home.astro
│   ├── about.astro
│   ├── admin.astro                     # CMS entry point
│   ├── faq.astro
│   ├── newsletter.astro
│   ├── shop.astro
│   ├── support.astro                   # Donate + sponsor
│   ├── thank-you.astro
│   ├── vendors.astro
│   └── events/
│       ├── index.astro                 # /events
│       ├── [slug].astro                # /events/:slug
│       └── [eventSlug]/
│           └── [subSlug].astro         # /events/:eventSlug/:subSlug
│
└── styles/
    ├── base.css
    ├── global.css
    └── tokens.css                      # Design tokens (colors, spacing, type)

docs/                                   # Architecture and operational docs
├── cms.md                              # Decap config, admin workflow, upload guardrails
├── components.md                       # Component contracts and props
├── Responsive.md                       # Breakpoint ladder, fluid typography/spacing
└── shopify.md                          # Storefront API integration
```

## Commands

| Command                   | Action                                                                         |
| :------------------------ | :----------------------------------------------------------------------------- |
| `npm install`             | Install dependencies                                                           |
| `npm run dev`             | Start local dev server at `localhost:4321`                                     |
| `npx decap-server`        | Start local Decap proxy (run alongside dev for local CMS editing)              |
| `npm run build`           | Build the production site to `./dist/`                                         |
| `npm run preview`         | Preview the production build locally before deploying                          |
| `npx astro sync`          | Regenerate content-collection types (run after schema changes in `config.ts`)  |
| `npm run astro -- --help` | Astro CLI help                                                                 |

## Environment Variables

Required for production builds and Netlify Functions. See `.env.example` for the full list.

| Variable                   | Purpose                                              |
| :------------------------- | :--------------------------------------------------- |
| `SHOPIFY_STORE_DOMAIN`     | Shopify store domain for Storefront API              |
| `SHOPIFY_STOREFRONT_TOKEN` | Shopify Storefront API access token                  |
| `SHOPIFY_USE_MOCKS`        | `"true"` to use mock product data (dev/preview)      |
| `MAILCHIMP_API_KEY`        | Newsletter integration *(migrating to MailerLite)*   |
| `MAILCHIMP_AUDIENCE_ID`    | Newsletter audience                                  |
| `MAILCHIMP_SERVER_PREFIX`  | Mailchimp regional server (e.g. `us21`)              |

## Deployment

Every push to `main` triggers a Netlify build. The build runs `npm run build`, which:

1. Loads content from `src/content/` (CMS-edited markdown / YAML / JSON).
2. Fetches products from Shopify Storefront API (mocked if `SHOPIFY_USE_MOCKS=true`).
3. Renders static HTML for every route.
4. Outputs to `dist/`, which Netlify serves.

Newsletter signups hit a Netlify Function (`src/pages/api/subscribe.ts`) at runtime, not at build time.

CMS saves commit directly to `main` via Git Gateway, which triggers a rebuild like any other commit. See [`docs/cms.md`](docs/cms.md) for the full save → deploy flow and build-minute considerations.

## Documentation

- [`docs/cms.md`](docs/cms.md) — Decap CMS architecture, admin workflow, upload guardrails, planned CMS features
- [`docs/components.md`](docs/components.md) — Component contracts and props
- [`docs/Responsive.md`](docs/Responsive.md) — Breakpoint ladder, fluid typography and spacing system
- [`docs/shopify.md`](docs/shopify.md) — Shopify Storefront API integration