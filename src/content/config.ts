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
            .enum(["liveShowcases", "gamesAndActivities", "contests", "popUps", "collaborations", "other"])
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

const neighbors = defineCollection({
    type: "content",
    schema: z.object({
        name: z.string(),
        tagline: z.string().optional(),
        url: optionalUrlField,
        image: z.string().optional(),
        displayOrder: z.number().int().default(0),
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
        partners: marqueeScopeSchema,
        support: marqueeScopeSchema,
        faq: marqueeScopeSchema,
    }),
});

const pageContent = defineCollection({
    type: "data",
    schema: z.object({
        // Used by the tagline entry (home page hero)
        taglineImage: z.string().optional(),
        taglineText: z.string().optional(),

        // Used by the mission entry (about page intro)
        mission: z.string().optional(),

        // Used by the quote entry (about page, below team)
        quote: z.string().optional(),
        attribution: z.string().optional(),

        backgroundMode: z.enum(["color", "image"]).default("color"),
        backgroundColor: z.string().default("#287feb"),
        backgroundImage: z.string().optional(),

        // Used by the logoBackdrop entry (header logo band)
        backdropMode: z.enum(["none", "color", "image"]).default("none"),
        backdropColor: z.string().default("#000000"),
        backdropImage: z.string().optional(),
    }),
});


/**
 * Peek mascot settings.
 *
 * A single entry (peek-settings.json) holds all per-page peek config.
 * BaseLayout reads this once and indexes by page key. All peek controls
 * live here so the client can adjust every page in one CMS save.
 */
const peekPageSchema = z.object({
    peekEnabled: z.boolean().default(false),
    peekVariant: z.enum(["default", "smile", "anger", "shock"]).default("default"),
    peekSide: z.enum(["left", "right"]).default("left"),
    peekBottom: z.string().default("80px"),
});

const peekSettings = defineCollection({
    type: "data",
    schema: z.object({
        home:           peekPageSchema,
        about:          peekPageSchema,
        eventsHome:     peekPageSchema,
        eventsDetail:   peekPageSchema,
        eventsSubevent: peekPageSchema,
        eventsArchive:  peekPageSchema,
        vendors:        peekPageSchema,
        partners:       peekPageSchema,
        shop:           peekPageSchema,
        faq:            peekPageSchema,
        support:        peekPageSchema,
        newsletter:     peekPageSchema,
    }),
});

export const collections = {
    events,
    subevents,
    team,
    vendors,
    neighbors,
    faq,
    sponsor,
    donate,
    settings,
    vendorSettings,
    marqueeSettings,
    pageContent,
    peekSettings,
};