import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { revalidatePath } from "next/cache";
import { prismaMock } from "../../helpers/prisma";
import { loginAsAdmin, loginAsMember, logout } from "../../helpers/auth";

import { upsertEventRecap } from "@/server/actions/event-recaps";
import { upsertEventPodium, deleteEventPodium } from "@/server/actions/event-podium";

const revalidateMock = vi.mocked(revalidatePath);

// A minimal valid recap input (the schema applies defaults, but we pass explicit values
// to keep the intent of each test obvious).
const baseRecapInput = () => ({
    status: "DRAFT" as const,
    summaryPoints: [] as string[],
    highlights: [] as string[],
    games: [] as Array<Record<string, unknown>>,
});

const validGame = (overrides: Record<string, unknown> = {}) => ({
    title: "Lag Rød",
    opponent: "Lag Blå",
    ourScore: 3,
    theirScore: 1,
    result: "WIN" as const,
    notes: "Bra kamp",
    ...overrides,
});

describe("upsertEventRecap", () => {
    beforeEach(() => {
        loginAsAdmin({ id: "admin_1" });
        prismaMock.event.findUnique.mockResolvedValue({ id: "event_1" } as never);
        prismaMock.eventRecap.findUnique.mockResolvedValue(null as never);
        prismaMock.eventRecap.upsert.mockResolvedValue({ id: "recap_1" } as never);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("auth guards", () => {
        it("rejects an unauthenticated caller (ensureMember resolves to null)", async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { ensureMemberMock } = await import("../../helpers/auth");
            ensureMemberMock.mockResolvedValue(null as never);

            const res = await upsertEventRecap("event_1", baseRecapInput() as never);

            expect(res.success).toBe(false);
            expect(res.error).toMatch(/tilgang/);
            expect(prismaMock.eventRecap.upsert).not.toHaveBeenCalled();
        });

        it("rejects a plain MEMBER", async () => {
            loginAsMember({ role: "MEMBER" });
            const res = await upsertEventRecap("event_1", baseRecapInput() as never);
            expect(res.success).toBe(false);
            expect(res.error).toMatch(/tilgang/);
            expect(prismaMock.eventRecap.upsert).not.toHaveBeenCalled();
        });

        it("allows a MODERATOR", async () => {
            loginAsMember({ id: "mod_1", role: "MODERATOR" });
            const res = await upsertEventRecap("event_1", baseRecapInput() as never);
            expect(res.success).toBe(true);
            expect(prismaMock.eventRecap.upsert).toHaveBeenCalled();
        });

        it("allows an ADMIN", async () => {
            const res = await upsertEventRecap("event_1", baseRecapInput() as never);
            expect(res.success).toBe(true);
            expect(prismaMock.eventRecap.upsert).toHaveBeenCalled();
        });
    });

    describe("validation", () => {
        it("rejects an invalid status value", async () => {
            const res = await upsertEventRecap("event_1", { ...baseRecapInput(), status: "ARCHIVED" } as never);
            expect(res.success).toBe(false);
            expect(prismaMock.eventRecap.upsert).not.toHaveBeenCalled();
        });

        it("rejects a game whose opponent is omitted entirely (required string)", async () => {
            const res = await upsertEventRecap("event_1", {
                ...baseRecapInput(),
                games: [{ title: "Lag Rød", ourScore: 1, theirScore: 0 }],
            } as never);
            expect(res.success).toBe(false);
            // opponent is a required string (no .optional()), so an omitted value is a type error.
            expect(res.error).toMatch(/expected string/i);
            expect(prismaMock.eventRecap.upsert).not.toHaveBeenCalled();
        });

        it("rejects a game whose opponent is a blank string (min(1) message)", async () => {
            const res = await upsertEventRecap("event_1", {
                ...baseRecapInput(),
                games: [{ title: "Lag Rød", opponent: "   ", ourScore: 1, theirScore: 0 }],
            } as never);
            expect(res.success).toBe(false);
            expect(res.error).toMatch(/Lag 2 er påkrevd/);
            expect(prismaMock.eventRecap.upsert).not.toHaveBeenCalled();
        });

        it("rejects a game whose title is blank (min(1) message)", async () => {
            const res = await upsertEventRecap("event_1", {
                ...baseRecapInput(),
                games: [{ title: "   ", opponent: "Lag Blå", ourScore: 1, theirScore: 0 }],
            } as never);
            expect(res.success).toBe(false);
            expect(res.error).toMatch(/Lag 1 er påkrevd/);
            expect(prismaMock.eventRecap.upsert).not.toHaveBeenCalled();
        });

        it("rejects publishing with no content (superRefine guard)", async () => {
            const res = await upsertEventRecap("event_1", {
                status: "PUBLISHED",
                summaryPoints: [],
                highlights: [],
                games: [],
            } as never);
            expect(res.success).toBe(false);
            expect(res.error).toMatch(/minst ett innholdsfelt/);
            expect(prismaMock.eventRecap.upsert).not.toHaveBeenCalled();
        });

        it("rejects more than 20 games", async () => {
            const games = Array.from({ length: 21 }, () => validGame());
            const res = await upsertEventRecap("event_1", { ...baseRecapInput(), games } as never);
            expect(res.success).toBe(false);
            expect(prismaMock.eventRecap.upsert).not.toHaveBeenCalled();
        });

        it("rejects a story exceeding the max length", async () => {
            const res = await upsertEventRecap("event_1", {
                ...baseRecapInput(),
                story: "x".repeat(12001),
            } as never);
            expect(res.success).toBe(false);
            expect(res.error).toMatch(/Historien er for lang/);
            expect(prismaMock.eventRecap.upsert).not.toHaveBeenCalled();
        });
    });

    describe("not found", () => {
        it("returns an error when the event does not exist", async () => {
            prismaMock.event.findUnique.mockResolvedValue(null as never);
            const res = await upsertEventRecap("missing_event", baseRecapInput() as never);
            expect(res.success).toBe(false);
            expect(res.error).toMatch(/Arrangementet finnes ikke/);
            expect(prismaMock.eventRecap.upsert).not.toHaveBeenCalled();
        });
    });

    describe("create branch (no existing recap)", () => {
        it("creates a DRAFT recap with no publishedAt and the author set to the member", async () => {
            prismaMock.eventRecap.findUnique.mockResolvedValue(null as never);

            const res = await upsertEventRecap("event_1", {
                ...baseRecapInput(),
                status: "DRAFT",
                story: "  En god dag  ",
            } as never);

            expect(res.success).toBe(true);
            const arg = prismaMock.eventRecap.upsert.mock.calls[0][0] as {
                where: Record<string, unknown>;
                create: Record<string, unknown>;
                update: Record<string, unknown>;
            };
            expect(arg.where).toEqual({ eventId: "event_1" });
            expect(arg.create.authorId).toBe("admin_1");
            expect(arg.create.status).toBe("DRAFT");
            expect(arg.create.publishedAt).toBeNull();
            // story is trimmed by the zod validator before reaching the action.
            expect(arg.create.story).toBe("En god dag");
            // No games -> create.games is undefined (not an empty createMany).
            expect(arg.create.games).toBeUndefined();
        });

        it("sets publishedAt to now when creating a PUBLISHED recap with content", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
            prismaMock.eventRecap.findUnique.mockResolvedValue(null as never);

            const res = await upsertEventRecap("event_1", {
                status: "PUBLISHED",
                summaryPoints: ["Vi vant"],
                highlights: [],
                games: [],
            } as never);

            expect(res.success).toBe(true);
            const arg = prismaMock.eventRecap.upsert.mock.calls[0][0] as { create: Record<string, unknown> };
            expect(arg.create.publishedAt).toEqual(new Date("2026-06-15T12:00:00.000Z"));
            expect(arg.create.summaryPoints).toEqual(["Vi vant"]);
        });

        it("builds a games createMany payload with order indices and trimmed fields", async () => {
            prismaMock.eventRecap.findUnique.mockResolvedValue(null as never);

            const res = await upsertEventRecap("event_1", {
                ...baseRecapInput(),
                games: [
                    validGame({ title: "Lag En", opponent: "Lag To", result: "WIN" }),
                    validGame({ title: "Lag Tre", opponent: "Lag Fire", result: "LOSS", notes: undefined }),
                ],
            } as never);

            expect(res.success).toBe(true);
            const arg = prismaMock.eventRecap.upsert.mock.calls[0][0] as {
                create: { games: { createMany: { data: Array<Record<string, unknown>> } } };
            };
            const rows = arg.create.games.createMany.data;
            expect(rows).toHaveLength(2);
            expect(rows[0]).toEqual(
                expect.objectContaining({ title: "Lag En", opponent: "Lag To", order: 0, result: "WIN" })
            );
            expect(rows[1]).toEqual(
                expect.objectContaining({ title: "Lag Tre", opponent: "Lag Fire", order: 1, notes: null })
            );
        });
    });

    describe("update branch (existing recap)", () => {
        it("DRAFT -> PUBLISHED: stamps publishedAt with now when previously unpublished", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
            prismaMock.eventRecap.findUnique.mockResolvedValue(
                { id: "recap_1", publishedAt: null } as never
            );

            const res = await upsertEventRecap("event_1", {
                status: "PUBLISHED",
                summaryPoints: ["Innhold"],
                highlights: [],
                games: [],
            } as never);

            expect(res.success).toBe(true);
            const arg = prismaMock.eventRecap.upsert.mock.calls[0][0] as { update: Record<string, unknown> };
            expect(arg.update.status).toBe("PUBLISHED");
            expect(arg.update.publishedAt).toEqual(new Date("2026-06-15T12:00:00.000Z"));
        });

        it("PUBLISHED again: preserves the original publishedAt rather than resetting it", async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
            const originalPublishedAt = new Date("2026-01-01T08:00:00.000Z");
            prismaMock.eventRecap.findUnique.mockResolvedValue(
                { id: "recap_1", publishedAt: originalPublishedAt } as never
            );

            const res = await upsertEventRecap("event_1", {
                status: "PUBLISHED",
                summaryPoints: ["Oppdatert innhold"],
                highlights: [],
                games: [],
            } as never);

            expect(res.success).toBe(true);
            const arg = prismaMock.eventRecap.upsert.mock.calls[0][0] as { update: Record<string, unknown> };
            expect(arg.update.publishedAt).toEqual(originalPublishedAt);
        });

        it("PUBLISHED -> DRAFT: clears publishedAt back to null", async () => {
            prismaMock.eventRecap.findUnique.mockResolvedValue(
                { id: "recap_1", publishedAt: new Date("2026-01-01T08:00:00.000Z") } as never
            );

            const res = await upsertEventRecap("event_1", baseRecapInput() as never);

            expect(res.success).toBe(true);
            const arg = prismaMock.eventRecap.upsert.mock.calls[0][0] as { update: Record<string, unknown> };
            expect(arg.update.status).toBe("DRAFT");
            expect(arg.update.publishedAt).toBeNull();
        });

        it("always deletes existing games and recreates them on update", async () => {
            prismaMock.eventRecap.findUnique.mockResolvedValue(
                { id: "recap_1", publishedAt: null } as never
            );

            const res = await upsertEventRecap("event_1", {
                ...baseRecapInput(),
                games: [validGame()],
            } as never);

            expect(res.success).toBe(true);
            const arg = prismaMock.eventRecap.upsert.mock.calls[0][0] as {
                update: { games: { deleteMany: unknown; createMany?: { data: unknown[] } } };
            };
            expect(arg.update.games.deleteMany).toEqual({});
            expect(arg.update.games.createMany?.data).toHaveLength(1);
        });

        it("update with no games still issues deleteMany but no createMany", async () => {
            prismaMock.eventRecap.findUnique.mockResolvedValue(
                { id: "recap_1", publishedAt: null } as never
            );

            const res = await upsertEventRecap("event_1", baseRecapInput() as never);

            expect(res.success).toBe(true);
            const arg = prismaMock.eventRecap.upsert.mock.calls[0][0] as {
                update: { games: { deleteMany: unknown; createMany?: unknown } };
            };
            expect(arg.update.games.deleteMany).toEqual({});
            expect(arg.update.games.createMany).toBeUndefined();
        });
    });

    describe("text normalization", () => {
        it("normalizeTextArray drops blank summaryPoints/highlights (after zod trims/filters)", async () => {
            prismaMock.eventRecap.findUnique.mockResolvedValue(null as never);
            // zod already trims and enforces min(1), so we pass already-trimmed values; the
            // action's normalizeTextArray is a defensive second pass.
            const res = await upsertEventRecap("event_1", {
                ...baseRecapInput(),
                summaryPoints: ["Punkt 1", "Punkt 2"],
                highlights: ["Wow"],
            } as never);

            expect(res.success).toBe(true);
            const arg = prismaMock.eventRecap.upsert.mock.calls[0][0] as { create: Record<string, unknown> };
            expect(arg.create.summaryPoints).toEqual(["Punkt 1", "Punkt 2"]);
            expect(arg.create.highlights).toEqual(["Wow"]);
        });

        it("coalesces optional text fields to null when omitted", async () => {
            prismaMock.eventRecap.findUnique.mockResolvedValue(null as never);
            const res = await upsertEventRecap("event_1", baseRecapInput() as never);
            expect(res.success).toBe(true);
            const arg = prismaMock.eventRecap.upsert.mock.calls[0][0] as { create: Record<string, unknown> };
            expect(arg.create.story).toBeNull();
            expect(arg.create.actionsTaken).toBeNull();
            expect(arg.create.lessons).toBeNull();
            expect(arg.create.nextTime).toBeNull();
        });
    });

    describe("revalidation and error handling", () => {
        it("revalidates the relevant paths on success", async () => {
            const res = await upsertEventRecap("event_1", baseRecapInput() as never);
            expect(res.success).toBe(true);
            expect(revalidateMock).toHaveBeenCalledWith("/events");
            expect(revalidateMock).toHaveBeenCalledWith("/events/event_1");
            expect(revalidateMock).toHaveBeenCalledWith("/admin/events");
            expect(revalidateMock).toHaveBeenCalledWith("/admin/events/event_1/recap");
        });

        it("returns a generic error when the upsert throws", async () => {
            prismaMock.eventRecap.upsert.mockRejectedValue(new Error("db down") as never);
            const res = await upsertEventRecap("event_1", baseRecapInput() as never);
            expect(res).toEqual({ success: false, error: "Kunne ikke lagre etterrapport" });
        });
    });
});

describe("upsertEventPodium", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.eventRecap.findUnique.mockResolvedValue({ id: "recap_1", eventId: "event_1" } as never);
        prismaMock.eventPodium.deleteMany.mockResolvedValue({ count: 0 } as never);
        prismaMock.eventPodium.create.mockResolvedValue({ id: "podium_1" } as never);
    });

    const individualInput = () => ({
        type: "INDIVIDUAL" as const,
        entries: [
            { place: 1, memberId: "member_1", teamMemberIds: [] },
            { place: 2, memberId: "member_2", teamMemberIds: [] },
        ],
    });

    const teamInput = () => ({
        type: "TEAM" as const,
        entries: [
            { place: 1, teamName: "Lag Alpha", teamMemberIds: ["member_1", "member_2"] },
            { place: 2, teamName: "Lag Beta", teamMemberIds: [] },
        ],
    });

    describe("auth guards", () => {
        it("rejects an unauthenticated caller", async () => {
            const { ensureMemberMock } = await import("../../helpers/auth");
            ensureMemberMock.mockResolvedValue(null as never);
            const res = await upsertEventPodium("recap_1", individualInput() as never);
            expect(res.success).toBe(false);
            expect(prismaMock.eventPodium.create).not.toHaveBeenCalled();
        });

        it("rejects a plain MEMBER", async () => {
            loginAsMember({ role: "MEMBER" });
            const res = await upsertEventPodium("recap_1", individualInput() as never);
            expect(res.success).toBe(false);
            expect(res.error).toMatch(/tilgang/);
            expect(prismaMock.eventPodium.create).not.toHaveBeenCalled();
        });

        it("allows a MODERATOR", async () => {
            loginAsMember({ role: "MODERATOR" });
            const res = await upsertEventPodium("recap_1", individualInput() as never);
            expect(res.success).toBe(true);
        });
    });

    describe("validation", () => {
        it("rejects an unknown podium type", async () => {
            const res = await upsertEventPodium("recap_1", {
                type: "DUO",
                entries: [{ place: 1, memberId: "m1", teamMemberIds: [] }],
            } as never);
            expect(res.success).toBe(false);
            expect(prismaMock.eventPodium.create).not.toHaveBeenCalled();
        });

        it("rejects an empty entries array", async () => {
            const res = await upsertEventPodium("recap_1", { type: "INDIVIDUAL", entries: [] } as never);
            expect(res.success).toBe(false);
            expect(prismaMock.eventPodium.create).not.toHaveBeenCalled();
        });

        it("rejects more than 3 entries", async () => {
            const res = await upsertEventPodium("recap_1", {
                type: "INDIVIDUAL",
                entries: [
                    { place: 1, memberId: "m1", teamMemberIds: [] },
                    { place: 2, memberId: "m2", teamMemberIds: [] },
                    { place: 3, memberId: "m3", teamMemberIds: [] },
                    { place: 3, memberId: "m4", teamMemberIds: [] },
                ],
            } as never);
            expect(res.success).toBe(false);
            expect(prismaMock.eventPodium.create).not.toHaveBeenCalled();
        });

        it("rejects a place outside 1..3", async () => {
            const res = await upsertEventPodium("recap_1", {
                type: "INDIVIDUAL",
                entries: [{ place: 4, memberId: "m1", teamMemberIds: [] }],
            } as never);
            expect(res.success).toBe(false);
            expect(prismaMock.eventPodium.create).not.toHaveBeenCalled();
        });

        it("INDIVIDUAL requires a memberId on every entry (superRefine)", async () => {
            const res = await upsertEventPodium("recap_1", {
                type: "INDIVIDUAL",
                entries: [{ place: 1, teamMemberIds: [] }],
            } as never);
            expect(res.success).toBe(false);
            expect(res.error).toMatch(/Velg et medlem for 1\. plass/);
            expect(prismaMock.eventPodium.create).not.toHaveBeenCalled();
        });

        it("TEAM requires a non-empty teamName on every entry (superRefine)", async () => {
            const res = await upsertEventPodium("recap_1", {
                type: "TEAM",
                entries: [{ place: 1, teamName: "   ", teamMemberIds: [] }],
            } as never);
            expect(res.success).toBe(false);
            expect(res.error).toMatch(/Skriv inn lagnavn for 1\. plass/);
            expect(prismaMock.eventPodium.create).not.toHaveBeenCalled();
        });
    });

    describe("not found", () => {
        it("returns an error when the recap does not exist", async () => {
            prismaMock.eventRecap.findUnique.mockResolvedValue(null as never);
            const res = await upsertEventPodium("missing_recap", individualInput() as never);
            expect(res.success).toBe(false);
            expect(res.error).toMatch(/Etterrapporten finnes ikke/);
            expect(prismaMock.eventPodium.deleteMany).not.toHaveBeenCalled();
            expect(prismaMock.eventPodium.create).not.toHaveBeenCalled();
        });
    });

    describe("INDIVIDUAL podium", () => {
        it("deletes any existing podium first, then creates entries with memberId and null teamName", async () => {
            const res = await upsertEventPodium("recap_1", individualInput() as never);

            expect(res.success).toBe(true);
            expect(prismaMock.eventPodium.deleteMany).toHaveBeenCalledWith({ where: { recapId: "recap_1" } });

            const arg = prismaMock.eventPodium.create.mock.calls[0][0] as {
                data: { recapId: string; type: string; entries: { create: Array<Record<string, unknown>> } };
            };
            expect(arg.data.recapId).toBe("recap_1");
            expect(arg.data.type).toBe("INDIVIDUAL");
            const created = arg.data.entries.create;
            expect(created).toHaveLength(2);
            expect(created[0]).toEqual(
                expect.objectContaining({ place: 1, memberId: "member_1", teamName: null })
            );
            // INDIVIDUAL entries never get a teamMembers nested create.
            expect(created[0].teamMembers).toBeUndefined();
            expect(created[1]).toEqual(
                expect.objectContaining({ place: 2, memberId: "member_2", teamName: null })
            );
        });

        it("ignores any stray teamMemberIds on INDIVIDUAL entries", async () => {
            const res = await upsertEventPodium("recap_1", {
                type: "INDIVIDUAL",
                entries: [{ place: 1, memberId: "member_1", teamMemberIds: ["member_9"] }],
            } as never);

            expect(res.success).toBe(true);
            const arg = prismaMock.eventPodium.create.mock.calls[0][0] as {
                data: { entries: { create: Array<Record<string, unknown>> } };
            };
            expect(arg.data.entries.create[0].teamMembers).toBeUndefined();
            expect(arg.data.entries.create[0].teamName).toBeNull();
        });
    });

    describe("TEAM podium", () => {
        it("creates entries with trimmed teamName, null memberId, and nested team members", async () => {
            const res = await upsertEventPodium("recap_1", teamInput() as never);

            expect(res.success).toBe(true);
            const arg = prismaMock.eventPodium.create.mock.calls[0][0] as {
                data: { type: string; entries: { create: Array<Record<string, unknown>> } };
            };
            expect(arg.data.type).toBe("TEAM");
            const created = arg.data.entries.create;

            // First entry has team members -> nested create present.
            expect(created[0]).toEqual(
                expect.objectContaining({ place: 1, teamName: "Lag Alpha", memberId: null })
            );
            expect(created[0].teamMembers).toEqual({
                create: [{ memberId: "member_1" }, { memberId: "member_2" }],
            });

            // Second entry has no team members -> nested create is undefined.
            expect(created[1]).toEqual(
                expect.objectContaining({ place: 2, teamName: "Lag Beta", memberId: null })
            );
            expect(created[1].teamMembers).toBeUndefined();
        });

        it("trims whitespace around the team name", async () => {
            const res = await upsertEventPodium("recap_1", {
                type: "TEAM",
                entries: [{ place: 1, teamName: "  Lag Gamma  ", teamMemberIds: [] }],
            } as never);

            expect(res.success).toBe(true);
            const arg = prismaMock.eventPodium.create.mock.calls[0][0] as {
                data: { entries: { create: Array<Record<string, unknown>> } };
            };
            expect(arg.data.entries.create[0].teamName).toBe("Lag Gamma");
        });
    });

    describe("place values / duplicates", () => {
        it("passes duplicate places straight through to the create (no app-level uniqueness enforcement)", async () => {
            // The action does not dedupe places; uniqueness is a DB constraint concern.
            const res = await upsertEventPodium("recap_1", {
                type: "INDIVIDUAL",
                entries: [
                    { place: 1, memberId: "m1", teamMemberIds: [] },
                    { place: 1, memberId: "m2", teamMemberIds: [] },
                ],
            } as never);

            expect(res.success).toBe(true);
            const arg = prismaMock.eventPodium.create.mock.calls[0][0] as {
                data: { entries: { create: Array<Record<string, unknown>> } };
            };
            expect(arg.data.entries.create.map((e) => e.place)).toEqual([1, 1]);
        });

        it("surfaces a unique-place DB constraint violation as a generic error", async () => {
            prismaMock.eventPodium.create.mockRejectedValue(
                Object.assign(new Error("Unique constraint failed"), { code: "P2002" }) as never
            );
            const res = await upsertEventPodium("recap_1", individualInput() as never);
            expect(res).toEqual({ success: false, error: "Kunne ikke lagre podium" });
        });
    });

    describe("revalidation", () => {
        it("revalidates admin recap, public event, and scoreboard paths on success", async () => {
            const res = await upsertEventPodium("recap_1", individualInput() as never);
            expect(res.success).toBe(true);
            expect(revalidateMock).toHaveBeenCalledWith("/admin/events/event_1/recap");
            expect(revalidateMock).toHaveBeenCalledWith("/events/event_1");
            expect(revalidateMock).toHaveBeenCalledWith("/scoreboard");
        });
    });
});

describe("deleteEventPodium", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.eventRecap.findUnique.mockResolvedValue({ eventId: "event_1" } as never);
        prismaMock.eventPodium.deleteMany.mockResolvedValue({ count: 1 } as never);
    });

    describe("auth guards", () => {
        it("rejects an unauthenticated caller", async () => {
            const { ensureMemberMock } = await import("../../helpers/auth");
            ensureMemberMock.mockResolvedValue(null as never);
            const res = await deleteEventPodium("recap_1");
            expect(res.success).toBe(false);
            expect(prismaMock.eventPodium.deleteMany).not.toHaveBeenCalled();
        });

        it("rejects a plain MEMBER", async () => {
            loginAsMember({ role: "MEMBER" });
            const res = await deleteEventPodium("recap_1");
            expect(res.success).toBe(false);
            expect(res.error).toMatch(/tilgang/);
            expect(prismaMock.eventPodium.deleteMany).not.toHaveBeenCalled();
        });

        it("allows a MODERATOR", async () => {
            loginAsMember({ role: "MODERATOR" });
            const res = await deleteEventPodium("recap_1");
            expect(res.success).toBe(true);
            expect(prismaMock.eventPodium.deleteMany).toHaveBeenCalled();
        });
    });

    it("deletes the podium and revalidates paths when the recap is found", async () => {
        const res = await deleteEventPodium("recap_1");
        expect(res.success).toBe(true);
        expect(prismaMock.eventPodium.deleteMany).toHaveBeenCalledWith({ where: { recapId: "recap_1" } });
        expect(revalidateMock).toHaveBeenCalledWith("/admin/events/event_1/recap");
        expect(revalidateMock).toHaveBeenCalledWith("/events/event_1");
        expect(revalidateMock).toHaveBeenCalledWith("/scoreboard");
    });

    it("still succeeds and deletes even when the recap no longer exists, skipping revalidation", async () => {
        prismaMock.eventRecap.findUnique.mockResolvedValue(null as never);
        revalidateMock.mockClear();

        const res = await deleteEventPodium("recap_gone");
        expect(res.success).toBe(true);
        expect(prismaMock.eventPodium.deleteMany).toHaveBeenCalledWith({ where: { recapId: "recap_gone" } });
        expect(revalidateMock).not.toHaveBeenCalled();
    });

    it("returns a generic error when deleteMany throws", async () => {
        prismaMock.eventPodium.deleteMany.mockRejectedValue(new Error("db down") as never);
        const res = await deleteEventPodium("recap_1");
        expect(res).toEqual({ success: false, error: "Kunne ikke slette podium" });
    });
});
