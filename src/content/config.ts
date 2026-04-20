import { defineCollection, z } from "astro:content";

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
        startDate: z.coerce.date(),                         // Use dates for sorting, display, and countdown
        endDate: z.coerce.date().optional(),                // multi-day (full datetime)
        endTime: z.string().optional(),                     // same-day (HH:mm)
        location: z.string().optional(),                    // The main event should have location; sub events can inherit or specify their own
        description: z.string().optional(),                 // Used on: events list card + event detail page
        eventUrl: optionalUrlField,                                 // Used on: event detail page (rsvp or hosted elsewhere)
        image: z.string().optional(),                       // Optional hero/card image
        featured: z.boolean().default(false),               // Drives homepage countdown (normally set true only on the main event)
    })
});

const subevents = defineCollection({
    type: "content",
    schema: z.object({
        parentEvent: z.string(), // main event slug
        category: z
            .enum(["liveShowcases", "gamesAndActivities", "contests", "other"])
            .default("other"),
        title: z.string(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date().optional(),
        endTime: z.string().optional(),                     // same-day (HH:mm)
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
    }),
});

const faq = defineCollection({
    type: "content",
    schema: z.object({
        question: z.string(),
        order: z.number().int().default(1),
    }),
});

const sponsor = defineCollection({
    type: "content",
    schema: z.object({
        stripeUrl: requiredUrlField,            // Stripe button link2
        poster: z.string().optional(), // Image for the sponsor poster
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

const marqueeScopeSchema = z.object({
    enabled: z.boolean().default(false),
    messages: z.array(z.string().min(1)).default([]),
    // Scroll duration in seconds for one full loop. Higher = slower.
    // Optional so the client doesn't have to set it; default is in the component.
    speed: z.number().positive().optional(),
});

const marqueeSettings = defineCollection({
    type: "data",
    schema: z.object({
        global: marqueeScopeSchema,
        home: marqueeScopeSchema,
        about: marqueeScopeSchema,
        events: marqueeScopeSchema,
        vendors: marqueeScopeSchema,
        sponsor: marqueeScopeSchema,
        donate: marqueeScopeSchema,
        faq: marqueeScopeSchema,
    }),
});

export const collections = { events, subevents, team, vendors, faq, sponsor, settings, vendorSettings, marqueeSettings };