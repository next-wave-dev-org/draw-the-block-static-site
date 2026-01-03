import { defineCollection, z } from "astro:content";

const events = defineCollection({
    type: "content",
    schema: z.object({
        title: z.string(),
        startDate: z.coerce.date(),
        endDate: z.coerce.date().optional(),
        location: z.string().optional(),
        summary: z.string(),
        image: z.string().optional(),
        rsvpUrl: z.string().url().optional(),
        cosplayUrl: z.string().url().optional(),
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

export const collections = { events, vendors, faq };
