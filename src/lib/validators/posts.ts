import { z } from "zod";
import { PostCategory } from "@prisma/client";

export const postSchema = z.object({
    title: z.string().min(1, "Tittel er påkrevd"),
    content: z.string().min(1, "Innhold er påkrevd"),
    category: z.nativeEnum(PostCategory).default("NYHET"),
    eventId: z.string().optional(),
    attachments: z.array(z.object({
        url: z.string().url(),
        name: z.string(),
        size: z.number(),
        key: z.string().optional(),
        type: z.string().optional(),
    })).optional().default([]),
});

export type PostInput = z.infer<typeof postSchema>;
