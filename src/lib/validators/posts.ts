import { z } from "zod";
import { PostCategory } from "@prisma/client";

export const postSchema = z.object({
    title: z.string().min(1, "Tittel er påkrevd"),
    content: z.string().min(1, "Innhold er påkrevd"),
    category: z.nativeEnum(PostCategory).default("NYHET"),
    eventId: z.string().optional(),
});

export type PostInput = z.infer<typeof postSchema>;
