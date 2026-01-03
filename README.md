# Draw The Block Static Website

## Prerequisites

Make sure you have the following installed:

- Node.js (LTS recommended)
- npm (comes with Node.js)
- Git

## Getting Started

1. Clone Repo
2. npm install
3. npm run dev

## Project Structure (for now)
```
src/
├── pages/          # Route-based pages (Astro routing)
│   ├── index.astro
│   ├── about.astro
│   ├── donate.astro
│   ├── faq.astro
│   ├── sponsor.astro
│   ├── vendors.astro
│   └── events/
│       ├── index.astro      # Events list page (/events)
│       └── [slug].astro     # Event detail pages (/events/:slug)
│
├── layouts/        # Shared layouts (header/footer)
│   └── BaseLayout.astro
│
├── components/     # Reusable UI components
│
├── assets/         # Static assets (images, icons, etc.)
│
public/
├── admin/          # CMS admin (added later)
│   ├── index.html
│   └── config.yml
│
dist/               # Production build output (generated)
node_modules/       # Dependencies (generated)
```

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
