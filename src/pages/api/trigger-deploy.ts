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
 * Requires a logged-in CMS user: the widget sends the user's Netlify Identity
 * JWT as `Authorization: Bearer <jwt>`, and this endpoint confirms it with the
 * site's own Identity service (GET /.netlify/identity/user answers 200 only for
 * a valid, unexpired token — no JWT secret or library needed here). Without this,
 * anyone could POST here in a loop and burn Netlify build minutes. Fails
 * closed: if Identity can't be reached, no build is triggered.
 *
 * Env var required (set in Netlify dashboard):
 *   NETLIFY_BUILD_HOOK_URL — Site settings → Build & deploy → Build hooks
 */
const json = (body: Record<string, unknown>, status: number) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

export const POST: APIRoute = async ({ request, url }) => {
    // 1. Must carry a Bearer token.
    const auth = request.headers.get('authorization') ?? '';
    if (!/^Bearer\s+\S+/i.test(auth)) {
        return json({ ok: false, error: 'Unauthorized' }, 401);
    }

    // 2. Token must be valid per this site's Identity service. `url.origin` is
    //    always one of this site's own hosts (Netlify routes by Host), and every
    //    host of the site shares one Identity instance.
    try {
        const identity = await fetch(new URL('/.netlify/identity/user', url.origin), {
            headers: { Authorization: auth },
            signal: AbortSignal.timeout(5000),
        });
        if (identity.status === 401 || identity.status === 403) {
            return json({ ok: false, error: 'Unauthorized' }, 401);
        }
        if (!identity.ok) {
            console.error(`Identity check returned HTTP ${identity.status}`);
            return json({ ok: false, error: 'Could not verify login' }, 503);
        }
    } catch (err) {
        console.error('Identity check failed:', err);
        return json({ ok: false, error: 'Could not verify login' }, 503);
    }

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
