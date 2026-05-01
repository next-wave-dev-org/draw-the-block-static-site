import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify/functions';

export default defineConfig({
    // ... your existing config ...

    redirects: {
        '/sponsor': '/support#sponsor',
        '/donate': '/support#donate',
    },
    output: 'server',
    adapter: netlify(),
});
