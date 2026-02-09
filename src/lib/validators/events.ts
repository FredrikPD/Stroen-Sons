import { z } from "zod";

export const eventSchema = z.object({
    title: z.string().min(1, "Tittel er påkrevd"),
    description: z.string().optional(),
    startAt: z.coerce.date(),
    endAt: z.preprocess((arg) => (arg === "" || arg === undefined ? undefined : arg), z.coerce.date().optional()),
    registrationDeadline: z.preprocess((arg) => (arg === "" || arg === undefined ? undefined : arg), z.coerce.date().optional()),
    maxAttendees: z.preprocess((arg) => (arg === "" || arg === undefined ? undefined : arg), z.coerce.number().min(1).optional()),

    // Modification: Location is now mostly optional for roaming events
    location: z.string().optional(),
    address: z.string().optional(),
    isTba: z.boolean().optional(),

    coverImage: z.string().min(1, "En cover-bilde er påkrevd"),
    totalCost: z.preprocess((arg) => (arg === "" || arg === undefined ? undefined : arg), z.coerce.number().min(0).optional()),
    clubSubsidy: z.preprocess((arg) => (arg === "" || arg === undefined ? undefined : arg), z.coerce.number().min(0).optional()),
    program: z.array(z.object({
        time: z.string().min(1, "Tidspunkt er påkrevd"),
        date: z.coerce.date().optional(),
        title: z.string().min(1, "Tittel er påkrevd"),
        description: z.string().optional(),
    })).optional(),

    sendNotification: z.boolean().optional(),
}).refine((data) => {
    if (data.endAt && data.startAt) {
        return data.endAt >= data.startAt;
    }
    return true;
}, {
    message: "Sluttdato må være etter startdato",
    path: ["endAt"],
}).refine((data) => {
    if (data.registrationDeadline && data.startAt) {
        return data.registrationDeadline <= data.startAt;
    }
    return true;
}, {
    message: "Påmeldingsfrist må være før arrangementet starter",
    path: ["registrationDeadline"],
});

export type EventInput = z.infer<typeof eventSchema>;
