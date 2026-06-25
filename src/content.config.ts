import { defineCollection, reference, z } from "astro:content";
import { glob } from "astro/loaders";

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
    loader: glob({ pattern: "**/*.md", base: "./src/content/events" }),
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
    loader: glob({ pattern: "**/*.md", base: "./src/content/subevents" }),
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
    loader: glob({ pattern: "**/*.{json,yaml}", base: "./src/content/team" }),
    schema: z.object({
        name: z.string(),
        role: z.string(),
        image: z.string(),
        displayOrder: z.number().int().nonnegative(),
        website: optionalUrlField,
    }),
});

const vendors = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/vendors" }),
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
    loader: glob({ pattern: "**/*.md", base: "./src/content/neighbors" }),
    schema: z.object({
        name: z.string(),
        tagline: z.string().optional(),
        url: optionalUrlField,
        image: z.string().optional(),
        displayOrder: z.number().int().default(0),
    }),
});

const faq = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/faq" }),
    schema: z.object({
        question: z.string(),
        order: z.number().int().default(1),
    }),
});

const sponsor = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/sponsor" }),
    schema: z.object({
        stripeUrl: requiredUrlField,
        poster: z.string().optional(),
        description: z.string().optional(),
    }),
});

const donate = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/donate" }),
    schema: z.object({
        kofiUrl: requiredUrlField,
        description: z.string().optional(),
    }),
});

const settings = defineCollection({
    loader: glob({ pattern: "**/*.{json,yaml}", base: "./src/content/settings" }),
    schema: z.object({
        discordUrl: optionalUrlField,
        instagramUrl: optionalUrlField,
    }),
});

const vendorSettings = defineCollection({
    loader: glob({ pattern: "**/*.{json,yaml}", base: "./src/content/vendorSettings" }),
    schema: z.object({
        vendorApplicationUrl: optionalUrlField,
        vendorAppInfo: z.string().optional(),
    }),
});

const marqueeScopeSchema = z.object({
    enabled: z.boolean().default(false),
    messages: z.array(z.string().min(1)).default([]),
    speed: z.coerce.number().positive().optional(),
});

const marqueeSettings = defineCollection({
    loader: glob({ pattern: "**/*.{json,yaml}", base: "./src/content/marqueeSettings" }),
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
    loader: glob({ pattern: "**/*.{json,yaml}", base: "./src/content/pageContent" }),
    schema: z.object({
        taglineImage: z.string().optional(),
        taglineText: z.string().optional(),
        mission: z.string().optional(),
        quote: z.string().optional(),
        attribution: z.string().optional(),
        backgroundMode: z.enum(["color", "image"]).default("color"),
        backgroundColor: z.string().default("#287feb"),
        backgroundImage: z.string().optional(),
        backdropMode: z.enum(["none", "image"]).default("none"),
        backdropImage: z.string().optional(),
    }),
});

const peekPageSchema = z.object({
    peekEnabled: z.boolean().default(false),
    peekVariant: z.enum(["default", "smile", "anger", "shock"]).default("default"),
    peekSide: z.enum(["left", "right"]).default("left"),
    peekBottom: z.string().default("80px"),
});

const peekSettings = defineCollection({
    loader: glob({ pattern: "**/*.{json,yaml}", base: "./src/content/peekSettings" }),
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
