import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
    // ... your existing config ...

    // Canonical origin (apex — www 301s here). Required for canonical URLs and the sitemap.
    site: 'https://drawtheblock.org',
    integrations: [
        sitemap({
            // /thank-you is noindex; /admin and /api aren't pages to index.
            filter: (page) => !/\/(thank-you|admin|api)(\/|$)/.test(new URL(page).pathname),
        }),
    ],

    redirects: {
        '/sponsor': '/support#sponsor',
        '/donate': '/support#donate',
    },
    output: 'server',
    adapter: netlify(),
});
