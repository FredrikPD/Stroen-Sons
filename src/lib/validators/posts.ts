import { z } from "zod";



export const postSchema = z.object({
    title: z.string().min(1, "Tittel er påkrevd"),
    content: z.string().min(1, "Innhold er påkrevd"),
    category: z.string().min(1, "Kategori er påkrevd"),
    eventId: z.string().optional(),
    attachments: z.array(z.object({
        url: z.string().url(),
        name: z.string(),
        size: z.number(),
        key: z.string().optional(),
        type: z.string().optional(),
    })).optional().default([]),
    sendNotification: z.boolean().optional().default(false),
});

export type PostInput = z.infer<typeof postSchema>;
