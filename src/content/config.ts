import { defineCollection, reference, z } from "astro:content";

const optionalUrlField = z.union([z.string(), z.literal("")])
    .optional()
    .transform(val => {
        if (!val) return undefined;
        if (!/^https?:\/\//i.test(val)) return `https://${val}`;
        return val;
    })
    .pipe(z.string().url().optional());

const requiredUrlField = z.string()
    .transform(val => {
        if (!/^https?:\/\//i.test(val)) return `https://${val}`;
        return val;
    })
    .pipe(z.string().url());

const events = defineCollection({
    type: "content",
    schema: z.object({
        title: z.string(),
        startDate: z.coerce.date(),
        endDate: z.preprocess(
            (val) => val === "" ? undefined : val,
            z.coerce.date().optional()
        ),
        endTime: z.string().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        eventUrl: optionalUrlField,
        image: z.string().optional(),
        featured: z.boolean().default(false),
    })
});

const subevents = defineCollection({
    type: "content",
    schema: z.object({
        parentEvent: z.string(),
        category: z
            .enum(["liveShowcases", "gamesAndActivities", "contests", "other"])
            .default("other"),
        title: z.string(),
        startDate: z.coerce.date(),
        endDate: z.preprocess(
            (val) => val === "" ? undefined : val,
            z.coerce.date().optional()
        ),
        endTime: z.string().optional(),
        location: z.string().optional(),
        description: z.string().optional(),
        eventUrl: optionalUrlField,
        image: z.string().optional(),
    }),
});

const team = defineCollection({
    type: "data",
    schema: z.object({
        name: z.string(),
        role: z.string(),
        image: z.string(),
        displayOrder: z.number().int().nonnegative(),
        website: optionalUrlField,
    }),
});

const vendors = defineCollection({
    type: "content",
    schema: z.object({
        name: z.string(),
        websiteUrl: optionalUrlField,
        instagramUrl: optionalUrlField,
        twitterUrl: optionalUrlField,
        bskyUrl: optionalUrlField,
        image: z.string().optional(),
        events: z.array(reference("events")).optional(),
    }),
});

const faq = defineCollection({
    type: "content",
    schema: z.object({
        question: z.string(),
        order: z.number().int().default(1),
    }),
});

/**
 * Sponsor collection.
 *
 * Now includes an optional `description` field used as the intro paragraph
 * on /support#sponsor. Lives under `support`'s SPONSOR section, no longer
 * its own page.
 */
const sponsor = defineCollection({
    type: "content",
    schema: z.object({
        stripeUrl: requiredUrlField,
        poster: z.string().optional(),
        description: z.string().optional(),
    }),
});

/**
 * Donate collection (new).
 *
 * Previously the donate page hardcoded the Ko-fi URL. Moving it into a
 * collection so the client can swap handles without a deploy.
 */
const donate = defineCollection({
    type: "content",
    schema: z.object({
        kofiUrl: requiredUrlField,
        description: z.string().optional(),
    }),
});

const settings = defineCollection({
    type: "data",
    schema: z.object({
        discordUrl: optionalUrlField,
        instagramUrl: optionalUrlField,
    }),
});

const vendorSettings = defineCollection({
    type: "data",
    schema: z.object({
        vendorApplicationUrl: optionalUrlField,
        vendorAppInfo: z.string().optional(),
    }),
});

/**
 * Marquee settings.
 *
 * Sponsor and Donate have been consolidated into a single /support page,
 * so their per-page marquee scopes are merged into a new `support` scope.
 * If migrating from the previous schema, copy whichever of sponsor/donate
 * was enabled into the new support entry; both old keys are gone.
 */
const marqueeScopeSchema = z.object({
    enabled: z.boolean().default(false),
    messages: z.array(z.string().min(1)).default([]),
    speed: z.coerce.number().positive().optional(),
});

const marqueeSettings = defineCollection({
    type: "data",
    schema: z.object({
        global: marqueeScopeSchema,
        home: marqueeScopeSchema,
        about: marqueeScopeSchema,
        events: marqueeScopeSchema,
        vendors: marqueeScopeSchema,
        support: marqueeScopeSchema,
        faq: marqueeScopeSchema,
    }),
});

const pageContent = defineCollection({
    type: "data",
    schema: ({ image }) =>
        z.object({
            // Used by the tagline entry (home page hero)
            taglineImage: z.string().optional(),
            taglineText: z.string().optional(),

            // Used by the mission entry (about page intro)
            mission: z.string().optional(),

            // Used by the quote entry (about page, below team)
            quote: z.string().optional(),
            attribution: z.string().optional(),
        }),
});

export const collections = {
    events,
    subevents,
    team,
    vendors,
    faq,
    sponsor,
    donate,
    settings,
    vendorSettings,
    marqueeSettings,
    pageContent,
};