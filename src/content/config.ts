import { defineCollection, z } from "astro:content";

const urlField = z.union([z.string(), z.literal("")])
    .optional()
    .transform(val => {
        if (!val) return undefined;
        if (!/^https?:\/\//i.test(val)) return `https://${val}`;
        return val;
    })
    .pipe(z.string().url().optional());

const events = defineCollection({
    type: "content",
    schema: z.object({
        title: z.string(),
        startDate: z.coerce.date(),                         // Use dates for sorting, display, and countdown
        endDate: z.coerce.date().optional(),                // multi-day (full datetime)
        endTime: z.string().optional(),                     // same-day (HH:mm)
        location: z.string().optional(),                    // The main event should have location; sub events can inherit or specify their own
        description: z.string().optional(),                 // Used on: events list card + event detail page
        eventUrl: urlField,                                 // Used on: event detail page (rsvp or hosted elsewhere)
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
        eventUrl: urlField,
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
        website: urlField,
    }),
});

const vendors = defineCollection({
    type: "content",
    schema: z.object({
        name: z.string(),
        category: z.string().optional(),
        websiteUrl: urlField,
        instagramUrl: urlField,
        image: z.string().optional(),
        blurb: z.string().optional(),
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
    stripeUrl: urlField,  // Stripe button link
    poster: z.string().optional(), // Image for the sponsor poster
  }),
});

const settings = defineCollection({
    type: "data",
    schema: z.object({
        discordUrl: urlField,
        instagramUrl: urlField,
        newsletterUrl: urlField,
    }),
});

export const collections = { events, subevents, team, vendors, faq, sponsor, settings };
