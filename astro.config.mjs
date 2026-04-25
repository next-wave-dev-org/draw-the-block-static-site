import { defineConfig } from 'astro/config';

export default defineConfig({
    // ... your existing config ...

    redirects: {
        '/sponsor': '/support#sponsor',
        '/donate': '/support#donate',
    },
});
