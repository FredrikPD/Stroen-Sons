import { describe, it, expect, afterEach, vi } from "vitest";
import { eventSchema } from "@/lib/validators/events";
import { postSchema } from "@/lib/validators/posts";
import { eventRecapSchema, eventRecapGameSchema } from "@/lib/validators/event-recaps";
import { eventPodiumSchema } from "@/lib/validators/event-podium";

/** Collect the issue paths (joined) from a failed safeParse for easy assertions. */
function issuePaths(result: { success: boolean; error?: { issues: { path: (string | number)[] }[] } }) {
    if (result.success || !result.error) return [];
    return result.error.issues.map((i) => i.path.join("."));
}

function issueMessages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
    if (result.success || !result.error) return [];
    return result.error.issues.map((i) => i.message);
}

describe("eventSchema", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    const validBase = () => ({
        title: "Sommerfest",
        startAt: "2026-07-01T18:00:00.000Z",
        coverImage: "https://img.example/cover.png"
    });

    it("parses a minimal valid event with only required fields", () => {
        const result = eventSchema.safeParse(validBase());
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.title).toBe("Sommerfest");
            expect(result.data.coverImage).toBe("https://img.example/cover.png");
            expect(result.data.startAt).toBeInstanceOf(Date);
            expect(result.data.startAt.toISOString()).toBe("2026-07-01T18:00:00.000Z");
        }
    });

    it("coerces startAt from an ISO string into a Date", () => {
        const result = eventSchema.safeParse({ ...validBase(), startAt: "2026-12-24T00:00:00.000Z" });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.startAt).toBeInstanceOf(Date);
            expect(result.data.startAt.getUTCFullYear()).toBe(2026);
        }
    });

    it("accepts a Date instance for startAt", () => {
        const result = eventSchema.safeParse({ ...validBase(), startAt: new Date("2026-07-01T18:00:00.000Z") });
        expect(result.success).toBe(true);
    });

    it("rejects when title is empty with the Norwegian message", () => {
        const result = eventSchema.safeParse({ ...validBase(), title: "" });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("title");
        expect(issueMessages(result)).toContain("Tittel er påkrevd");
    });

    it("rejects when title is missing", () => {
        const { title, ...rest } = validBase();
        void title;
        const result = eventSchema.safeParse(rest);
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("title");
    });

    it("rejects when coverImage is an empty string", () => {
        const result = eventSchema.safeParse({ ...validBase(), coverImage: "" });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("coverImage");
        expect(issueMessages(result)).toContain("En cover-bilde er påkrevd");
    });

    it("rejects when coverImage is missing", () => {
        const { coverImage, ...rest } = validBase();
        void coverImage;
        const result = eventSchema.safeParse(rest);
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("coverImage");
    });

    it("rejects when startAt is missing", () => {
        const { startAt, ...rest } = validBase();
        void startAt;
        const result = eventSchema.safeParse(rest);
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("startAt");
    });

    it("rejects an invalid startAt value that cannot be coerced", () => {
        const result = eventSchema.safeParse({ ...validBase(), startAt: "not-a-date" });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("startAt");
    });

    it("treats empty-string endAt as undefined (optional)", () => {
        const result = eventSchema.safeParse({ ...validBase(), endAt: "" });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.endAt).toBeUndefined();
        }
    });

    it("treats empty-string registrationDeadline/maxAttendees/costs as undefined", () => {
        const result = eventSchema.safeParse({
            ...validBase(),
            registrationDeadline: "",
            maxAttendees: "",
            totalCost: "",
            clubSubsidy: ""
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.registrationDeadline).toBeUndefined();
            expect(result.data.maxAttendees).toBeUndefined();
            expect(result.data.totalCost).toBeUndefined();
            expect(result.data.clubSubsidy).toBeUndefined();
        }
    });

    it("coerces maxAttendees from a numeric string", () => {
        const result = eventSchema.safeParse({ ...validBase(), maxAttendees: "25" });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.maxAttendees).toBe(25);
        }
    });

    it("accepts maxAttendees at the minimum boundary of 1", () => {
        const result = eventSchema.safeParse({ ...validBase(), maxAttendees: 1 });
        expect(result.success).toBe(true);
    });

    it("rejects maxAttendees below the minimum (0)", () => {
        const result = eventSchema.safeParse({ ...validBase(), maxAttendees: 0 });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("maxAttendees");
    });

    it("coerces totalCost and clubSubsidy from numeric strings", () => {
        const result = eventSchema.safeParse({ ...validBase(), totalCost: "1000", clubSubsidy: "250" });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.totalCost).toBe(1000);
            expect(result.data.clubSubsidy).toBe(250);
        }
    });

    it("accepts totalCost/clubSubsidy at the zero boundary", () => {
        const result = eventSchema.safeParse({ ...validBase(), totalCost: 0, clubSubsidy: 0 });
        expect(result.success).toBe(true);
    });

    it("rejects negative totalCost", () => {
        const result = eventSchema.safeParse({ ...validBase(), totalCost: -1 });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("totalCost");
    });

    it("rejects negative clubSubsidy", () => {
        const result = eventSchema.safeParse({ ...validBase(), clubSubsidy: -5 });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("clubSubsidy");
    });

    it("accepts optional location, address, isTba, description, category", () => {
        const result = eventSchema.safeParse({
            ...validBase(),
            location: "Oslo",
            address: "Karl Johans gate 1",
            isTba: true,
            description: "A fun party",
            category: "SOCIAL"
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.location).toBe("Oslo");
            expect(result.data.isTba).toBe(true);
        }
    });

    it("rejects a non-boolean isTba", () => {
        const result = eventSchema.safeParse({ ...validBase(), isTba: "yes" });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("isTba");
    });

    it("accepts endAt equal to startAt (boundary of the refinement)", () => {
        const result = eventSchema.safeParse({
            ...validBase(),
            startAt: "2026-07-01T18:00:00.000Z",
            endAt: "2026-07-01T18:00:00.000Z"
        });
        expect(result.success).toBe(true);
    });

    it("accepts endAt after startAt", () => {
        const result = eventSchema.safeParse({
            ...validBase(),
            startAt: "2026-07-01T18:00:00.000Z",
            endAt: "2026-07-01T20:00:00.000Z"
        });
        expect(result.success).toBe(true);
    });

    it("rejects endAt before startAt with the sluttdato message on endAt", () => {
        const result = eventSchema.safeParse({
            ...validBase(),
            startAt: "2026-07-01T18:00:00.000Z",
            endAt: "2026-07-01T10:00:00.000Z"
        });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("endAt");
        expect(issueMessages(result)).toContain("Sluttdato må være etter startdato");
    });

    it("accepts registrationDeadline equal to startAt (boundary)", () => {
        const result = eventSchema.safeParse({
            ...validBase(),
            startAt: "2026-07-01T18:00:00.000Z",
            registrationDeadline: "2026-07-01T18:00:00.000Z"
        });
        expect(result.success).toBe(true);
    });

    it("accepts registrationDeadline before startAt", () => {
        const result = eventSchema.safeParse({
            ...validBase(),
            startAt: "2026-07-01T18:00:00.000Z",
            registrationDeadline: "2026-06-25T12:00:00.000Z"
        });
        expect(result.success).toBe(true);
    });

    it("rejects registrationDeadline after startAt with the påmeldingsfrist message", () => {
        const result = eventSchema.safeParse({
            ...validBase(),
            startAt: "2026-07-01T18:00:00.000Z",
            registrationDeadline: "2026-07-02T12:00:00.000Z"
        });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("registrationDeadline");
        expect(issueMessages(result)).toContain("Påmeldingsfrist må være før arrangementet starter");
    });

    it("accepts a valid program array", () => {
        const result = eventSchema.safeParse({
            ...validBase(),
            program: [
                { time: "18:00", title: "Velkomst", description: "Mingling" },
                { time: "19:00", title: "Middag", date: "2026-07-01T19:00:00.000Z" }
            ]
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.program).toHaveLength(2);
            expect(result.data.program?.[1].date).toBeInstanceOf(Date);
        }
    });

    it("rejects a program entry with empty time", () => {
        const result = eventSchema.safeParse({
            ...validBase(),
            program: [{ time: "", title: "Velkomst" }]
        });
        expect(result.success).toBe(false);
        expect(issueMessages(result)).toContain("Tidspunkt er påkrevd");
    });

    it("rejects a program entry with empty title", () => {
        const result = eventSchema.safeParse({
            ...validBase(),
            program: [{ time: "18:00", title: "" }]
        });
        expect(result.success).toBe(false);
        expect(issuePaths(result).some((p) => p.includes("program"))).toBe(true);
    });

    it("accepts sendNotification flag", () => {
        const result = eventSchema.safeParse({ ...validBase(), sendNotification: true });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.sendNotification).toBe(true);
        }
    });

    it("does not default optional fields that are absent", () => {
        const result = eventSchema.safeParse(validBase());
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.description).toBeUndefined();
            expect(result.data.endAt).toBeUndefined();
            expect(result.data.maxAttendees).toBeUndefined();
            expect(result.data.program).toBeUndefined();
        }
    });
});

describe("postSchema", () => {
    const validBase = () => ({
        title: "Nyhet",
        content: "Noe innhold",
        category: "NYHET"
    });

    it("parses a minimal valid post and applies defaults", () => {
        const result = postSchema.safeParse(validBase());
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.attachments).toEqual([]);
            expect(result.data.sendNotification).toBe(false);
            expect(result.data.eventId).toBeUndefined();
        }
    });

    it("rejects an empty title", () => {
        const result = postSchema.safeParse({ ...validBase(), title: "" });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("title");
        expect(issueMessages(result)).toContain("Tittel er påkrevd");
    });

    it("rejects empty content", () => {
        const result = postSchema.safeParse({ ...validBase(), content: "" });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("content");
        expect(issueMessages(result)).toContain("Innhold er påkrevd");
    });

    it("rejects an empty category", () => {
        const result = postSchema.safeParse({ ...validBase(), category: "" });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("category");
        expect(issueMessages(result)).toContain("Kategori er påkrevd");
    });

    it("collects all missing required field issues at once", () => {
        const result = postSchema.safeParse({});
        expect(result.success).toBe(false);
        const paths = issuePaths(result);
        expect(paths).toEqual(expect.arrayContaining(["title", "content", "category"]));
    });

    it("accepts an optional eventId", () => {
        const result = postSchema.safeParse({ ...validBase(), eventId: "event_123" });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.eventId).toBe("event_123");
        }
    });

    it("accepts a valid attachment with a full URL", () => {
        const result = postSchema.safeParse({
            ...validBase(),
            attachments: [
                { url: "https://files.example/a.pdf", name: "a.pdf", size: 1024, key: "k1", type: "application/pdf" }
            ]
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.attachments).toHaveLength(1);
        }
    });

    it("accepts an attachment without optional key/type", () => {
        const result = postSchema.safeParse({
            ...validBase(),
            attachments: [{ url: "https://files.example/a.pdf", name: "a.pdf", size: 2048 }]
        });
        expect(result.success).toBe(true);
    });

    it("rejects an attachment with an invalid url", () => {
        const result = postSchema.safeParse({
            ...validBase(),
            attachments: [{ url: "not-a-url", name: "a.pdf", size: 1024 }]
        });
        expect(result.success).toBe(false);
        expect(issuePaths(result).some((p) => p.includes("attachments") && p.includes("url"))).toBe(true);
    });

    it("rejects an attachment with a non-numeric size", () => {
        const result = postSchema.safeParse({
            ...validBase(),
            attachments: [{ url: "https://files.example/a.pdf", name: "a.pdf", size: "big" }]
        });
        expect(result.success).toBe(false);
        expect(issuePaths(result).some((p) => p.includes("attachments") && p.includes("size"))).toBe(true);
    });

    it("respects an explicitly provided sendNotification value", () => {
        const result = postSchema.safeParse({ ...validBase(), sendNotification: true });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.sendNotification).toBe(true);
        }
    });

    it("accepts an explicit empty attachments array", () => {
        const result = postSchema.safeParse({ ...validBase(), attachments: [] });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.attachments).toEqual([]);
        }
    });
});

describe("eventRecapGameSchema", () => {
    it("parses a complete valid game", () => {
        const result = eventRecapGameSchema.safeParse({
            title: "Strøen",
            opponent: "Naboklubben",
            ourScore: 3,
            theirScore: 1,
            result: "WIN",
            notes: "Bra kamp"
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.ourScore).toBe(3);
            expect(result.data.result).toBe("WIN");
        }
    });

    it("trims whitespace from title and opponent", () => {
        const result = eventRecapGameSchema.safeParse({ title: "  Lag A  ", opponent: "  Lag B  " });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.title).toBe("Lag A");
            expect(result.data.opponent).toBe("Lag B");
        }
    });

    it("rejects an empty/whitespace title with the Lag 1 message", () => {
        const result = eventRecapGameSchema.safeParse({ title: "   ", opponent: "Lag B" });
        expect(result.success).toBe(false);
        expect(issueMessages(result)).toContain("Lag 1 er påkrevd");
    });

    it("rejects an empty opponent with the Lag 2 message", () => {
        const result = eventRecapGameSchema.safeParse({ title: "Lag A", opponent: "" });
        expect(result.success).toBe(false);
        expect(issueMessages(result)).toContain("Lag 2 er påkrevd");
    });

    it("coerces score strings into integers", () => {
        const result = eventRecapGameSchema.safeParse({ title: "Lag A", opponent: "Lag B", ourScore: "5", theirScore: "2" });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.ourScore).toBe(5);
            expect(result.data.theirScore).toBe(2);
        }
    });

    it("treats empty-string scores as undefined", () => {
        const result = eventRecapGameSchema.safeParse({ title: "Lag A", opponent: "Lag B", ourScore: "", theirScore: "" });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.ourScore).toBeUndefined();
            expect(result.data.theirScore).toBeUndefined();
        }
    });

    it("accepts a score of zero (boundary)", () => {
        const result = eventRecapGameSchema.safeParse({ title: "Lag A", opponent: "Lag B", ourScore: 0 });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.ourScore).toBe(0);
        }
    });

    it("rejects a negative score", () => {
        const result = eventRecapGameSchema.safeParse({ title: "Lag A", opponent: "Lag B", ourScore: -1 });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("ourScore");
    });

    it("rejects a non-integer score", () => {
        const result = eventRecapGameSchema.safeParse({ title: "Lag A", opponent: "Lag B", ourScore: 1.5 });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("ourScore");
    });

    it("rejects an invalid result enum", () => {
        const result = eventRecapGameSchema.safeParse({ title: "Lag A", opponent: "Lag B", result: "TIE" });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("result");
    });

    it.each(["WIN", "DRAW", "LOSS"] as const)("accepts the result enum value %s", (value) => {
        const result = eventRecapGameSchema.safeParse({ title: "Lag A", opponent: "Lag B", result: value });
        expect(result.success).toBe(true);
    });

    it("accepts notes at the max length of 600", () => {
        const result = eventRecapGameSchema.safeParse({ title: "Lag A", opponent: "Lag B", notes: "x".repeat(600) });
        expect(result.success).toBe(true);
    });

    it("rejects notes over 600 characters with the for lange message", () => {
        const result = eventRecapGameSchema.safeParse({ title: "Lag A", opponent: "Lag B", notes: "x".repeat(601) });
        expect(result.success).toBe(false);
        expect(issueMessages(result)).toContain("Notater er for lange");
    });
});

describe("eventRecapSchema", () => {
    it("applies defaults for an empty object (DRAFT status)", () => {
        const result = eventRecapSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.status).toBe("DRAFT");
            expect(result.data.summaryPoints).toEqual([]);
            expect(result.data.highlights).toEqual([]);
            expect(result.data.games).toEqual([]);
            expect(result.data.story).toBeUndefined();
        }
    });

    it("allows a DRAFT with no content (no publish requirement)", () => {
        const result = eventRecapSchema.safeParse({ status: "DRAFT" });
        expect(result.success).toBe(true);
    });

    it("rejects an invalid status enum", () => {
        const result = eventRecapSchema.safeParse({ status: "ARCHIVED" });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("status");
    });

    it("rejects PUBLISHED with no content via superRefine on status path", () => {
        const result = eventRecapSchema.safeParse({ status: "PUBLISHED" });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("status");
        expect(issueMessages(result)).toContain("Du må fylle ut minst ett innholdsfelt før publisering.");
    });

    it("allows PUBLISHED when summaryPoints has content", () => {
        const result = eventRecapSchema.safeParse({ status: "PUBLISHED", summaryPoints: ["Vi vant"] });
        expect(result.success).toBe(true);
    });

    it("allows PUBLISHED when story has content", () => {
        const result = eventRecapSchema.safeParse({ status: "PUBLISHED", story: "Hele historien" });
        expect(result.success).toBe(true);
    });

    it("allows PUBLISHED when there is at least one game", () => {
        const result = eventRecapSchema.safeParse({
            status: "PUBLISHED",
            games: [{ title: "Lag A", opponent: "Lag B" }]
        });
        expect(result.success).toBe(true);
    });

    it("allows PUBLISHED when highlights has content", () => {
        const result = eventRecapSchema.safeParse({ status: "PUBLISHED", highlights: ["Mål i siste minutt"] });
        expect(result.success).toBe(true);
    });

    it("trims and validates summaryPoints entries", () => {
        const result = eventRecapSchema.safeParse({ summaryPoints: ["  poeng  "] });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.summaryPoints).toEqual(["poeng"]);
        }
    });

    it("rejects an empty summaryPoint entry", () => {
        const result = eventRecapSchema.safeParse({ summaryPoints: [""] });
        expect(result.success).toBe(false);
        expect(issuePaths(result).some((p) => p.startsWith("summaryPoints"))).toBe(true);
    });

    it("rejects a summaryPoint over 160 chars", () => {
        const result = eventRecapSchema.safeParse({ summaryPoints: ["x".repeat(161)] });
        expect(result.success).toBe(false);
        expect(issuePaths(result).some((p) => p.startsWith("summaryPoints"))).toBe(true);
    });

    it("accepts summaryPoints at max length 8 entries", () => {
        const result = eventRecapSchema.safeParse({ summaryPoints: Array.from({ length: 8 }, (_, i) => `p${i}`) });
        expect(result.success).toBe(true);
    });

    it("rejects more than 8 summaryPoints", () => {
        const result = eventRecapSchema.safeParse({ summaryPoints: Array.from({ length: 9 }, (_, i) => `p${i}`) });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("summaryPoints");
    });

    it("rejects a highlight over 40 chars", () => {
        const result = eventRecapSchema.safeParse({ highlights: ["x".repeat(41)] });
        expect(result.success).toBe(false);
        expect(issuePaths(result).some((p) => p.startsWith("highlights"))).toBe(true);
    });

    it("rejects more than 12 highlights", () => {
        const result = eventRecapSchema.safeParse({ highlights: Array.from({ length: 13 }, (_, i) => `h${i}`) });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("highlights");
    });

    it("rejects more than 20 games", () => {
        const games = Array.from({ length: 21 }, () => ({ title: "A", opponent: "B" }));
        const result = eventRecapSchema.safeParse({ games });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("games");
    });

    it("accepts story at the max length of 12000", () => {
        const result = eventRecapSchema.safeParse({ story: "x".repeat(12000) });
        expect(result.success).toBe(true);
    });

    it("rejects story over 12000 chars with the for lang message", () => {
        const result = eventRecapSchema.safeParse({ story: "x".repeat(12001) });
        expect(result.success).toBe(false);
        expect(issueMessages(result)).toContain("Historien er for lang");
    });

    it("rejects actionsTaken over 5000 chars", () => {
        const result = eventRecapSchema.safeParse({ actionsTaken: "x".repeat(5001) });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("actionsTaken");
    });

    it("rejects lessons over 4000 chars", () => {
        const result = eventRecapSchema.safeParse({ lessons: "x".repeat(4001) });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("lessons");
    });

    it("rejects nextTime over 4000 chars", () => {
        const result = eventRecapSchema.safeParse({ nextTime: "x".repeat(4001) });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("nextTime");
    });

    it("propagates nested game validation errors", () => {
        const result = eventRecapSchema.safeParse({ games: [{ title: "", opponent: "Lag B" }] });
        expect(result.success).toBe(false);
        expect(issuePaths(result).some((p) => p.startsWith("games"))).toBe(true);
    });
});

describe("eventPodiumSchema", () => {
    it("parses a valid INDIVIDUAL podium with memberIds", () => {
        const result = eventPodiumSchema.safeParse({
            type: "INDIVIDUAL",
            entries: [
                { place: 1, memberId: "m1" },
                { place: 2, memberId: "m2" }
            ]
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.entries[0].teamMemberIds).toEqual([]);
        }
    });

    it("parses a valid TEAM podium with team names", () => {
        const result = eventPodiumSchema.safeParse({
            type: "TEAM",
            entries: [
                { place: 1, teamName: "Lag Rød", teamMemberIds: ["m1", "m2"] }
            ]
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.entries[0].teamMemberIds).toEqual(["m1", "m2"]);
        }
    });

    it("rejects an invalid type enum", () => {
        const result = eventPodiumSchema.safeParse({ type: "SOLO", entries: [{ place: 1, memberId: "m1" }] });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("type");
    });

    it("rejects an empty entries array (min 1)", () => {
        const result = eventPodiumSchema.safeParse({ type: "INDIVIDUAL", entries: [] });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("entries");
    });

    it("rejects more than 3 entries (max 3)", () => {
        const result = eventPodiumSchema.safeParse({
            type: "INDIVIDUAL",
            entries: [
                { place: 1, memberId: "m1" },
                { place: 2, memberId: "m2" },
                { place: 3, memberId: "m3" },
                { place: 3, memberId: "m4" }
            ]
        });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("entries");
    });

    it("rejects a place below 1", () => {
        const result = eventPodiumSchema.safeParse({ type: "INDIVIDUAL", entries: [{ place: 0, memberId: "m1" }] });
        expect(result.success).toBe(false);
        expect(issuePaths(result).some((p) => p.includes("place"))).toBe(true);
    });

    it("rejects a place above 3", () => {
        const result = eventPodiumSchema.safeParse({ type: "INDIVIDUAL", entries: [{ place: 4, memberId: "m1" }] });
        expect(result.success).toBe(false);
        expect(issuePaths(result).some((p) => p.includes("place"))).toBe(true);
    });

    it("rejects a non-integer place", () => {
        const result = eventPodiumSchema.safeParse({ type: "INDIVIDUAL", entries: [{ place: 1.5, memberId: "m1" }] });
        expect(result.success).toBe(false);
        expect(issuePaths(result).some((p) => p.includes("place"))).toBe(true);
    });

    it("defaults teamMemberIds to an empty array when omitted", () => {
        const result = eventPodiumSchema.safeParse({ type: "INDIVIDUAL", entries: [{ place: 1, memberId: "m1" }] });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.entries[0].teamMemberIds).toEqual([]);
        }
    });

    it("rejects an INDIVIDUAL entry missing memberId with a place-specific message", () => {
        const result = eventPodiumSchema.safeParse({ type: "INDIVIDUAL", entries: [{ place: 2 }] });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("entries");
        expect(issueMessages(result)).toContain("Velg et medlem for 2. plass");
    });

    it("rejects a TEAM entry missing teamName with a place-specific message", () => {
        const result = eventPodiumSchema.safeParse({ type: "TEAM", entries: [{ place: 3 }] });
        expect(result.success).toBe(false);
        expect(issuePaths(result)).toContain("entries");
        expect(issueMessages(result)).toContain("Skriv inn lagnavn for 3. plass");
    });

    it("rejects a TEAM entry with a whitespace-only teamName", () => {
        const result = eventPodiumSchema.safeParse({ type: "TEAM", entries: [{ place: 1, teamName: "   " }] });
        expect(result.success).toBe(false);
        expect(issueMessages(result)).toContain("Skriv inn lagnavn for 1. plass");
    });

    it("trims teamName and rejects when over 100 chars", () => {
        const result = eventPodiumSchema.safeParse({
            type: "TEAM",
            entries: [{ place: 1, teamName: "x".repeat(101) }]
        });
        expect(result.success).toBe(false);
        expect(issuePaths(result).some((p) => p.includes("teamName"))).toBe(true);
    });

    it("accepts a TEAM entry teamName at the max length of 100", () => {
        const result = eventPodiumSchema.safeParse({
            type: "TEAM",
            entries: [{ place: 1, teamName: "x".repeat(100) }]
        });
        expect(result.success).toBe(true);
    });

    it("does not enforce memberId for TEAM type", () => {
        const result = eventPodiumSchema.safeParse({
            type: "TEAM",
            entries: [{ place: 1, teamName: "Lag A" }]
        });
        expect(result.success).toBe(true);
    });

    it("does not enforce teamName for INDIVIDUAL type", () => {
        const result = eventPodiumSchema.safeParse({
            type: "INDIVIDUAL",
            entries: [{ place: 1, memberId: "m1" }]
        });
        expect(result.success).toBe(true);
    });
});
