import { z } from "zod";

export const eventSchema = z.object({
    title: z.string().min(1, "Tittel er påkrevd"),
    description: z.string().optional(),
    startAt: z.coerce.date(),
    location: z.string().optional(),
    address: z.string().optional(),
    coverImage: z.string().optional(),
    totalCost: z.coerce.number().min(0).optional(),
    clubSubsidy: z.coerce.number().min(0).optional(),
    program: z.array(z.object({
        time: z.string().min(1, "Tidspunkt er påkrevd"),
        title: z.string().min(1, "Tittel er påkrevd"),
        description: z.string().optional(),
    })).optional(),
});

export type EventInput = z.infer<typeof eventSchema>;
