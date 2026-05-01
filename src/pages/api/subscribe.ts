import type { APIRoute } from 'astro';

/**
 * Mailchimp newsletter subscribe endpoint.
 *
 * Receives form-encoded POST from /newsletter. Validates input,
 * submits to Mailchimp with double-opt-in (status: "pending"),
 * redirects on success or error.
 *
 * Compiled to a Netlify Function by @astrojs/netlify. Lives at
 * /api/subscribe in production; runs server-side, not pre-rendered.
 *
 * Note on double-opt-in: status "pending" tells Mailchimp to send a
 * confirmation email. The subscriber is not added to the active list
 * until they click the confirmation link. To switch to single
 * opt-in (subscriber added immediately, no confirmation), change
 * "pending" to "subscribed".
 */
export const POST: APIRoute = async ({ request, redirect }) => {
    const apiKey = import.meta.env.MAILCHIMP_API_KEY;
    const audienceId = import.meta.env.MAILCHIMP_AUDIENCE_ID;
    const serverPrefix = import.meta.env.MAILCHIMP_SERVER_PREFIX;

    if (!apiKey || !audienceId || !serverPrefix) {
        console.error('Missing Mailchimp environment variables');
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

    // Mailchimp API call
    const url = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members`;

    // Mailchimp uses HTTP Basic auth: any username + the API key as
    // password. The "anystring" username is convention; Mailchimp
    // ignores it but requires it to be present. "anystring" is what
    // their docs use.
    const auth = Buffer.from(`anystring:${apiKey}`).toString('base64');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email_address: email,
                status: 'pending', // double-opt-in
                merge_fields: {
                    FNAME: firstName,
                    LNAME: lastName,
                },
            }),
        });

        if (response.ok) {
            // Success — user lands at the pretty /thank-you page.
            return redirect('/thank-you', 303);
        }

        // Mailchimp returned an error. Common cases:
        // - "Member Exists": subscriber already on list. We treat this
        //   as success — user signed up, mission accomplished, no need
        //   to surface the duplicate to them.
        // - "Invalid Resource": malformed email or other validation issue.
        const data = await response.json().catch(() => ({}));
        const title = data?.title ?? 'Unknown';

        if (title === 'Member Exists') {
            return redirect('/thank-you', 303);
        }

        console.error('Mailchimp error:', title, data?.detail);
        return redirect('/newsletter?error=api', 303);
    } catch (err) {
        console.error('Subscribe endpoint network error:', err);
        return redirect('/newsletter?error=network', 303);
    }
};

// This endpoint must run server-side. The previous patch added
// `prerender = true` to every existing page; we explicitly opt OUT
// here so Astro/Netlify compile this route to a Function.
export const prerender = false;