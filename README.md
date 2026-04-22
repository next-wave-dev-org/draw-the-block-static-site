# Draw The Block Static Website

## LIVE MVP SITE:
https://draw-the-block-static-site.pages.dev/

## Prerequisites
Make sure you have the following installed:
- Node.js (LTS recommended)
- npm (comes with Node.js)
- Git

## Getting Started
1. Clone the repo
2. `npm install`
3. `npm run dev` — starts the Astro dev server at `localhost:4321`
4. In a second terminal: `npx decap-server` — starts the local Decap CMS proxy so the admin UI at `/admin` can read/write content files without going through Git. Only needed when editing content through the CMS locally.

## Project Structure
```
public/
├── admin/                              # Decap CMS admin UI
│   ├── config.yml                      # Collection definitions (what the client edits)
│   └── index.html
├── fonts/
│   └── HelveticaNeue-CondensedBold.woff2
├── images/                             # Static imagery (logo, mascot, etc.)
└── uploads/                            # Media uploaded through the CMS

src/
├── assets/                             # Astro-processed assets
│
├── components/                         # Reusable UI components
│   ├── Breadcrumb.astro                # Hierarchical path nav (EVENTS / X / Y)
│   ├── Countdown.astro                 # ClientRouter-safe event countdown
│   ├── EventCard.astro                 # Shared card for events + subevents
│   └── Marquee.astro                   # Scrolling announcement band
│
├── content/                            # Astro content collections
│   ├── config.ts                       # Collection schemas (Zod)
│   ├── events/                         # Event entries (markdown)
│   ├── faq/                            # FAQ entries (markdown)
│   ├── marqueeSettings/                # Marquee config (global + per-page overrides)
│   ├── settings/                       # Site settings (social links, etc.)
│   ├── sponsor/                        # Sponsor entry
│   ├── subevents/                      # Sub-event entries (children of events)
│   ├── team/                           # Team member entries
│   ├── vendors/                        # Vendor entries
│   └── vendorSettings/                 # Vendor application config
│
├── layouts/
│   └── BaseLayout.astro                # Site chrome: logo, nav, marquee, footer
│
├── pages/                              # Route-based pages (Astro routing)
│   ├── index.astro
│   ├── home.astro
│   ├── about.astro
│   ├── admin.astro
│   ├── donate.astro
│   ├── faq.astro
│   ├── newsletter.astro
│   ├── sponsor.astro
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

dist/                                   # Production build output (generated)
node_modules/                           # Dependencies (generated)
```

## Commands
All commands are run from the root of the project, from a terminal:

| Command                   | Action                                                                         |
| :------------------------ | :----------------------------------------------------------------------------- |
| `npm install`             | Installs dependencies                                                          |
| `npm run dev`             | Starts local dev server at `localhost:4321`                                    |
| `npx decap-server`        | Starts local Decap CMS proxy (run alongside dev server for local CMS editing)  |
| `npm run build`           | Builds the production site to `./dist/`                                        |
| `npm run preview`         | Preview the production build locally, before deploying                         |
| `npx astro sync`          | Regenerates content collection types (run after schema changes in `config.ts`) |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check`                               |
| `npm run astro -- --help` | Get help using the Astro CLI                                                   |
