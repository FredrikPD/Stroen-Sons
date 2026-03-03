import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
    if (value === "" || value === null || value === undefined) {
        return undefined;
    }
    return value;
};

export const eventRecapGameSchema = z.object({
    title: z.string().trim().min(1, "Lag 1 er påkrevd"),
    opponent: z.string().trim().min(1, "Lag 2 er påkrevd"),
    ourScore: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
    theirScore: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
    result: z.enum(["WIN", "DRAW", "LOSS"]).optional(),
    notes: z.string().trim().max(600, "Notater er for lange").optional(),
});

export const eventRecapSchema = z.object({
    status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
    summaryPoints: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
    story: z.string().trim().max(12000, "Historien er for lang").optional(),
    actionsTaken: z.string().trim().max(5000, "Feltet er for langt").optional(),
    highlights: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    lessons: z.string().trim().max(4000, "Feltet er for langt").optional(),
    nextTime: z.string().trim().max(4000, "Feltet er for langt").optional(),
    games: z.array(eventRecapGameSchema).max(20).default([]),
}).superRefine((data, ctx) => {
    if (data.status === "PUBLISHED") {
        const hasContent =
            data.summaryPoints.length > 0 ||
            Boolean(data.story) ||
            data.games.length > 0 ||
            data.highlights.length > 0;

        if (!hasContent) {
            ctx.addIssue({
                code: "custom",
                message: "Du må fylle ut minst ett innholdsfelt før publisering.",
                path: ["status"],
            });
        }
    }
});

export type EventRecapInput = z.infer<typeof eventRecapSchema>;
