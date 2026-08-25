import type { APIRoute } from 'astro';

/**
 * Manual "Update Shop" trigger for the CMS button (public/admin/widgets.js).
 *
 * Products are fetched from Shopify at build time (src/lib/shopify.ts), so
 * catalog changes need a rebuild to reach the live site. This endpoint POSTs
 * to a Netlify build hook on behalf of the CMS button, keeping the actual
 * hook URL server-side — Netlify build hooks are effectively bearer tokens
 * (anyone with the URL can trigger a build), so it must never ship in the
 * public admin JS.
 *
 * Unauthenticated, same as /api/subscribe. Worst case someone spams manual
 * rebuilds; there's no data to leak through this endpoint.
 *
 * Env var required (set in Netlify dashboard):
 *   NETLIFY_BUILD_HOOK_URL — Site settings → Build & deploy → Build hooks
 */
export const POST: APIRoute = async () => {
    const hookUrl = import.meta.env.NETLIFY_BUILD_HOOK_URL;

    if (!hookUrl) {
        console.error('Missing NETLIFY_BUILD_HOOK_URL environment variable');
        return new Response(JSON.stringify({ ok: false, error: 'Not configured' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const response = await fetch(hookUrl, { method: 'POST' });

        if (!response.ok) {
            console.error(`Build hook returned HTTP ${response.status}`);
            return new Response(JSON.stringify({ ok: false, error: `Build hook HTTP ${response.status}` }), {
                status: 502,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('Build hook trigger failed:', err);
        return new Response(JSON.stringify({ ok: false, error: 'Network error' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

// Must run server-side so the build hook URL never reaches the client.
export const prerender = false;
