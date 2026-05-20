import type { APIRoute } from 'astro';

/**
 * MailerLite newsletter subscribe endpoint.
 *
 * Receives form-encoded POST from /newsletter. Validates input,
 * submits to MailerLite v3 API, redirects on success or error.
 *
 * Compiled to a Netlify Function by @astrojs/netlify. Lives at
 * /api/subscribe in production; runs server-side, not pre-rendered.
 *
 * Double opt-in is configured at the account level in MailerLite —
 * no status flag needed here. MailerLite will send the confirmation
 * email automatically. The subscriber is not active until they click
 * the confirmation link.
 *
 * Env vars required (set in Netlify dashboard):
 *   MAILERLITE_API_KEY   — MailerLite v3 API token
 *   MAILERLITE_GROUP_ID  — Target group ID (from MailerLite Groups)
 */
export const POST: APIRoute = async ({ request, redirect }) => {
    const apiKey = import.meta.env.MAILERLITE_API_KEY;
    const groupId = import.meta.env.MAILERLITE_GROUP_ID;

    if (!apiKey || !groupId) {
        console.error('Missing MailerLite environment variables');
        return redirect('/newsletter?error=config', 303);
    }

    // Parse form data
    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return redirect('/newsletter?error=invalid', 303);
    }

    const email = formData.get('email')?.toString().trim();
    const firstName = formData.get('firstName')?.toString().trim() ?? '';
    const lastName = formData.get('lastName')?.toString().trim() ?? '';

    // Basic validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return redirect('/newsletter?error=email', 303);
    }

    // MailerLite v3 API call
    const url = 'https://connect.mailerlite.com/api/subscribers';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                email,
                fields: {
                    name: firstName,
                    last_name: lastName,
                },
                groups: [groupId],
            }),
        });

        // 200 = existing subscriber updated, 201 = new subscriber created.
        // Both are success — send to thank-you page.
        if (response.ok) {
            return redirect('/thank-you', 303);
        }

        const data = await response.json().catch(() => ({}));

        // 409 = subscriber already exists with no changes needed.
        // Treat as success — mission accomplished.
        if (response.status === 409) {
            return redirect('/thank-you', 303);
        }

        // 422 = validation error (malformed email, etc.)
        if (response.status === 422) {
            return redirect('/newsletter?error=email', 303);
        }

        console.error('MailerLite error — status:', response.status);
        console.error('MailerLite error — body:', JSON.stringify(data));
        console.error('MailerLite error — groupId present:', !!groupId, '— apiKey present:', !!apiKey);
        return redirect('/newsletter?error=api', 303);
    } catch (err) {
        console.error('Subscribe endpoint network error:', err);
        return redirect('/newsletter?error=network', 303);
    }
};

// This endpoint must run server-side. Explicitly opt OUT of
// pre-rendering so Astro/Netlify compile this route to a Function.
export const prerender = false;