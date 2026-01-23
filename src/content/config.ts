import { defineCollection, z } from "astro:content";

const events = defineCollection({
    type: "content",
    schema: z.object({
        kind: z.enum(["main", "sub"]).default("sub"),   // Identify the role of this entry
        title: z.string(),
        startDate: z.coerce.date(),                         // Use dates for sorting, display, and countdown
        endDate: z.coerce.date().optional(),
        location: z.string().optional(),                    // The main event should have location; sub events can inherit or specify their own
        description: z.string().optional(),                 // Used on: events list card + event detail page
        rsvpUrl: z.string().url().optional(),               // Used on: event detail page (optional)
        image: z.string().optional(),                       // Optional hero/card image
        featured: z.boolean().default(false),           // Drives homepage countdown (normally set true only on the main event)
    }),
});

const team = defineCollection({
    type: "data",
    schema: z.object({
        name: z.string(),
        role: z.string(),
        image: z.string(),
        displayOrder: z.number().int().nonnegative(),
        website: z.string().url().optional(),
    }),
});

const vendors = defineCollection({
    type: "content",
    schema: z.object({
        name: z.string(),
        category: z.string().optional(),
        websiteUrl: z.string().url().optional(),
        instagramUrl: z.string().url().optional(),
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

export const collections = { events, team, vendors, faq };
