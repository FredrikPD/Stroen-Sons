import { z } from "zod";

const podiumEntrySchema = z.object({
    place: z.number().int().min(1).max(3),
    teamName: z.string().trim().max(100).optional(),
    memberId: z.string().optional(),
    teamMemberIds: z.array(z.string()).default([]),
});

export const eventPodiumSchema = z.object({
    type: z.enum(["INDIVIDUAL", "TEAM"]),
    entries: z.array(podiumEntrySchema).min(1).max(3),
}).superRefine((data, ctx) => {
    if (data.type === "INDIVIDUAL") {
        for (const entry of data.entries) {
            if (!entry.memberId) {
                ctx.addIssue({
                    code: "custom",
                    message: `Velg et medlem for ${entry.place}. plass`,
                    path: ["entries"],
                });
            }
        }
    } else {
        for (const entry of data.entries) {
            if (!entry.teamName?.trim()) {
                ctx.addIssue({
                    code: "custom",
                    message: `Skriv inn lagnavn for ${entry.place}. plass`,
                    path: ["entries"],
                });
            }
        }
    }
});

export type EventPodiumInput = z.infer<typeof eventPodiumSchema>;
