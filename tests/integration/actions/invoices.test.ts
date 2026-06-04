import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { makePaymentRequest, makeTransaction, dec } from "../../helpers/fixtures";
import { loginAsAdmin, loginAsMember } from "../../helpers/auth";

// invoices.ts calls createNotificationsForMembers; stub it (async) so .catch/await chains are safe.
vi.mock("@/server/actions/notifications", () => ({
    createNotification: vi.fn(async () => undefined),
    createManyNotifications: vi.fn(async () => undefined),
    createNotificationsForMembers: vi.fn(async () => undefined),
    broadcastNotification: vi.fn(async () => undefined),
    notifyNewPhotos: vi.fn(async () => undefined),
    sendInvoiceDeadlineReminders: vi.fn(async () => undefined)
}));

import {
    getInvoiceGroups,
    getInvoiceGroupDetails,
    getInvoiceFormData,
    updateInvoiceGroup,
    deleteInvoiceGroup,
    getInvoices,
    deleteMultipleInvoices
} from "@/server/actions/invoices";
import { createNotificationsForMembers } from "@/server/actions/notifications";
import { revalidatePath } from "next/cache";

// A fixed batch timestamp so grouping by `title__createdAt.toISOString()` is deterministic.
const BATCH_AT = new Date("2026-06-01T08:00:00.000Z");
const BATCH_AT_2 = new Date("2026-06-02T08:00:00.000Z");

describe("getInvoiceGroups", () => {
    it("excludes MEMBERSHIP_FEE requests via the where clause", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);

        const res = await getInvoiceGroups();

        expect(res.success).toBe(true);
        expect(prismaMock.paymentRequest.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { category: { not: "MEMBERSHIP_FEE" } }
            })
        );
    });

    it("groups requests by title + createdAt and computes paid/total counts and totalAmount", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            makePaymentRequest({
                id: "r1",
                title: "Cup fee",
                category: "EVENT",
                createdAt: BATCH_AT,
                amount: 100,
                status: "PENDING",
                member: { id: "m1", firstName: "A", lastName: "A" }
            }),
            makePaymentRequest({
                id: "r2",
                title: "Cup fee",
                category: "EVENT",
                createdAt: BATCH_AT,
                amount: 200,
                status: "PAID",
                member: { id: "m2", firstName: "B", lastName: "B" }
            }),
            makePaymentRequest({
                id: "r3",
                title: "Cup fee",
                category: "EVENT",
                createdAt: BATCH_AT,
                amount: 50.5,
                status: "PAID",
                member: { id: "m3", firstName: "C", lastName: "C" }
            })
        ] as never);

        const res = await getInvoiceGroups();

        expect(res.success).toBe(true);
        expect(res.groups).toHaveLength(1);
        const g = res.groups![0];
        expect(g.id).toBe("r1"); // first request in the batch becomes the group id
        expect(g.title).toBe("Cup fee");
        expect(g.totalCount).toBe(3);
        expect(g.paidCount).toBe(2);
        expect(g.totalAmount).toBeCloseTo(350.5, 5);
        expect(g.requests).toHaveLength(3);
        // Amounts are converted from Decimal to plain numbers.
        expect(typeof g.requests[0].amount).toBe("number");
    });

    it("separates requests with the same title but different createdAt into distinct groups", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            makePaymentRequest({ id: "r1", title: "Tur", category: "OTHER", createdAt: BATCH_AT, amount: 100 }),
            makePaymentRequest({ id: "r2", title: "Tur", category: "OTHER", createdAt: BATCH_AT_2, amount: 100 })
        ] as never);

        const res = await getInvoiceGroups();

        expect(res.success).toBe(true);
        expect(res.groups).toHaveLength(2);
        const ids = res.groups!.map((g) => g.id).sort();
        expect(ids).toEqual(["r1", "r2"]);
    });

    it("returns an empty group list when there are no non-membership requests", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        const res = await getInvoiceGroups();
        expect(res.success).toBe(true);
        expect(res.groups).toEqual([]);
    });

    it("returns a failure result when the query throws", async () => {
        prismaMock.paymentRequest.findMany.mockRejectedValue(new Error("db down"));
        const res = await getInvoiceGroups();
        expect(res).toEqual({ success: false, error: "Kunne ikke hente fakturaer" });
    });
});

describe("getInvoiceGroupDetails", () => {
    it("resolves the group by id (findUnique) then fetches its requests", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue({
            id: "grp_1",
            title: "Cup fee",
            createdAt: BATCH_AT
        } as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            makePaymentRequest({
                id: "r1",
                title: "Cup fee",
                createdAt: BATCH_AT,
                amount: 120.25,
                transaction: makeTransaction({ amount: dec(120.25) }),
                member: { id: "m1", firstName: "A", lastName: "A" },
                event: null
            })
        ] as never);

        const res = await getInvoiceGroupDetails("grp_1");

        expect(res.success).toBe(true);
        expect(res.groupId).toBe("grp_1");
        expect(res.title).toBe("Cup fee");
        // Filtering for the requests uses the resolved title + createdAt.
        expect(prismaMock.paymentRequest.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { title: "Cup fee", createdAt: BATCH_AT }
            })
        );
        // Amount and nested transaction amount converted to numbers.
        expect(typeof res.requests![0].amount).toBe("number");
        expect(res.requests![0].transaction.amount).toBeCloseTo(120.25, 5);
    });

    it("falls back to title lookup (findFirst) when findUnique by id misses", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(null as never);
        prismaMock.paymentRequest.findFirst.mockResolvedValue({
            id: "r_first",
            title: "Legacy Title",
            createdAt: BATCH_AT
        } as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            makePaymentRequest({ id: "r_first", title: "Legacy Title", createdAt: BATCH_AT, transaction: null })
        ] as never);

        const res = await getInvoiceGroupDetails("Legacy Title");

        expect(res.success).toBe(true);
        expect(res.groupId).toBe("r_first");
        expect(prismaMock.paymentRequest.findFirst).toHaveBeenCalled();
        // Null transaction stays null.
        expect(res.requests![0].transaction).toBeNull();
    });

    it("returns an error when no group can be resolved", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(null as never);
        prismaMock.paymentRequest.findFirst.mockResolvedValue(null as never);
        const res = await getInvoiceGroupDetails("missing");
        expect(res).toEqual({ success: false, error: "Fant ingen fakturaer i denne gruppen." });
    });

    it("returns a failure result when fetching the requests throws", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue({
            id: "grp", title: "T", createdAt: BATCH_AT
        } as never);
        prismaMock.paymentRequest.findMany.mockRejectedValue(new Error("boom"));
        const res = await getInvoiceGroupDetails("grp");
        expect(res).toEqual({ success: false, error: "Kunne ikke hente fakturadetaljer" });
    });
});

describe("getInvoiceFormData", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns active members and only future events", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));

        prismaMock.member.findMany.mockResolvedValue([
            { id: "m1", firstName: "A", lastName: "A" }
        ] as never);
        prismaMock.event.findMany.mockResolvedValue([
            { id: "e1", title: "Future", startAt: new Date("2026-07-01T18:00:00.000Z"), attendees: [{ id: "m1" }] }
        ] as never);

        const res = await getInvoiceFormData();

        expect(res.members).toHaveLength(1);
        expect(res.events).toHaveLength(1);
        // Active filter on members.
        expect(prismaMock.member.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { deletedAt: null } })
        );
        // Future-only events filter relative to "now".
        const eventCall = prismaMock.event.findMany.mock.calls[0][0] as {
            where: { startAt: { gte: Date } };
        };
        expect(eventCall.where.startAt.gte).toEqual(new Date("2026-06-15T12:00:00.000Z"));
    });
});

describe("updateInvoiceGroup", () => {
    const resolveTo = (group: { id: string; title: string; createdAt: Date }) => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(group as never);
    };

    beforeEach(() => {
        loginAsAdmin();
        prismaMock.paymentRequest.createMany.mockResolvedValue({ count: 1 } as never);
        prismaMock.paymentRequest.deleteMany.mockResolvedValue({ count: 1 } as never);
        prismaMock.paymentRequest.updateMany.mockResolvedValue({ count: 1 } as never);
    });

    it("rejects a negative amount before touching the database", async () => {
        const res = await updateInvoiceGroup("grp", { amount: -1 });
        expect(res).toEqual({ success: false, error: "Beløp kan ikke være negativt" });
        expect(prismaMock.paymentRequest.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.paymentRequest.updateMany).not.toHaveBeenCalled();
    });

    it("rejects a non-finite amount (Infinity)", async () => {
        const res = await updateInvoiceGroup("grp", { amount: Infinity });
        expect(res.success).toBe(false);
        expect(prismaMock.paymentRequest.updateMany).not.toHaveBeenCalled();
    });

    it("returns an error when the group cannot be resolved", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(null as never);
        prismaMock.paymentRequest.findFirst.mockResolvedValue(null as never);
        const res = await updateInvoiceGroup("missing", { description: "x" });
        expect(res).toEqual({ success: false, error: "Fant ingen fakturaer i denne gruppen." });
    });

    it("returns an error when the resolved group has no existing requests", async () => {
        resolveTo({ id: "grp", title: "T", createdAt: BATCH_AT });
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        const res = await updateInvoiceGroup("grp", { description: "x" });
        expect(res).toEqual({ success: false, error: "Fant ingen fakturaer i denne gruppen." });
    });

    it("updates description/amount/dueDate on all remaining requests and revalidates", async () => {
        resolveTo({ id: "grp", title: "Cup fee", createdAt: BATCH_AT });
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            {
                id: "r1", memberId: "m1", status: "PENDING",
                amount: 100, description: "old", dueDate: new Date("2026-06-30T00:00:00.000Z"),
                category: "EVENT", eventId: null
            }
        ] as never);

        const newDue = new Date("2026-07-15T00:00:00.000Z");
        const res = await updateInvoiceGroup("grp", { description: "new desc", amount: 199.999, dueDate: newDue });

        expect(res).toEqual({ success: true });
        expect(prismaMock.paymentRequest.updateMany).toHaveBeenCalledWith({
            where: { title: "Cup fee", createdAt: BATCH_AT },
            data: { description: "new desc", amount: 200, dueDate: newDue }
        });
        expect(revalidatePath).toHaveBeenCalledWith("/admin/finance/invoices");
        expect(revalidatePath).toHaveBeenCalledWith("/admin/finance/invoices/grp");
    });

    it("does not call updateMany when no updatable fields are provided", async () => {
        resolveTo({ id: "grp", title: "Cup fee", createdAt: BATCH_AT });
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            { id: "r1", memberId: "m1", status: "PENDING", amount: 100, description: "old", dueDate: null, category: "EVENT", eventId: null }
        ] as never);

        const res = await updateInvoiceGroup("grp", {});
        expect(res).toEqual({ success: true });
        expect(prismaMock.paymentRequest.updateMany).not.toHaveBeenCalled();
    });

    it("adds new members via createMany using the template, and notifies them", async () => {
        resolveTo({ id: "grp", title: "Cup fee", createdAt: BATCH_AT });
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            { id: "r1", memberId: "m1", status: "PENDING", amount: 100, description: "desc", dueDate: new Date("2026-06-30T00:00:00.000Z"), category: "EVENT", eventId: "e1" }
        ] as never);

        // Keep m1, add m2 + m3.
        const res = await updateInvoiceGroup("grp", {}, ["m1", "m2", "m3"]);

        expect(res).toEqual({ success: true });
        expect(prismaMock.paymentRequest.createMany).toHaveBeenCalledTimes(1);
        const createArg = prismaMock.paymentRequest.createMany.mock.calls[0][0] as {
            data: Array<Record<string, unknown>>;
        };
        expect(createArg.data).toHaveLength(2);
        expect(createArg.data.map((d) => d.memberId).sort()).toEqual(["m2", "m3"]);
        // New requests inherit batch key (title + createdAt) and template fields.
        expect(createArg.data[0]).toEqual(
            expect.objectContaining({
                title: "Cup fee",
                createdAt: BATCH_AT,
                category: "EVENT",
                eventId: "e1",
                status: "PENDING",
                amount: 100
            })
        );
        expect(createNotificationsForMembers).toHaveBeenCalledWith(
            expect.objectContaining({
                memberIds: expect.arrayContaining(["m2", "m3"]),
                type: "INVOICE_CREATED",
                link: "/invoices"
            })
        );
        // No one was removed, so no deleteMany.
        expect(prismaMock.paymentRequest.deleteMany).not.toHaveBeenCalled();
    });

    it("removes PENDING members no longer in the list via deleteMany", async () => {
        resolveTo({ id: "grp", title: "Cup fee", createdAt: BATCH_AT });
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            { id: "r1", memberId: "m1", status: "PENDING", amount: 100, description: "d", dueDate: null, category: "EVENT", eventId: null },
            { id: "r2", memberId: "m2", status: "PENDING", amount: 100, description: "d", dueDate: null, category: "EVENT", eventId: null }
        ] as never);

        // Drop m2.
        const res = await updateInvoiceGroup("grp", {}, ["m1"]);

        expect(res).toEqual({ success: true });
        expect(prismaMock.paymentRequest.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ["r2"] } }
        });
        expect(prismaMock.paymentRequest.createMany).not.toHaveBeenCalled();
    });

    it("blocks the whole update when trying to remove a member who has PAID", async () => {
        resolveTo({ id: "grp", title: "Cup fee", createdAt: BATCH_AT });
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            { id: "r1", memberId: "m1", status: "PENDING", amount: 100, description: "d", dueDate: null, category: "EVENT", eventId: null },
            { id: "r2", memberId: "m2", status: "PAID", amount: 100, description: "d", dueDate: null, category: "EVENT", eventId: null }
        ] as never);
        prismaMock.member.findMany.mockResolvedValue([
            { firstName: "Ola", lastName: "Nordmann" }
        ] as never);

        // Attempt to remove the PAID member m2.
        const res = await updateInvoiceGroup("grp", { amount: 500 }, ["m1"]);

        expect(res.success).toBe(false);
        expect(res.error).toContain("Ola Nordmann");
        // It must NOT delete or update after blocking.
        expect(prismaMock.paymentRequest.deleteMany).not.toHaveBeenCalled();
        expect(prismaMock.paymentRequest.updateMany).not.toHaveBeenCalled();
    });

    it("applies both an add and a (pending) remove in a single sync", async () => {
        resolveTo({ id: "grp", title: "Cup fee", createdAt: BATCH_AT });
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            { id: "r1", memberId: "m1", status: "PENDING", amount: 100, description: "d", dueDate: null, category: "EVENT", eventId: null }
        ] as never);

        // Remove m1, add m2.
        const res = await updateInvoiceGroup("grp", {}, ["m2"]);

        expect(res).toEqual({ success: true });
        expect(prismaMock.paymentRequest.createMany).toHaveBeenCalledTimes(1);
        expect(prismaMock.paymentRequest.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ["r1"] } }
        });
    });

    it("returns a failure result when a database write throws", async () => {
        resolveTo({ id: "grp", title: "Cup fee", createdAt: BATCH_AT });
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            { id: "r1", memberId: "m1", status: "PENDING", amount: 100, description: "d", dueDate: null, category: "EVENT", eventId: null }
        ] as never);
        prismaMock.paymentRequest.updateMany.mockRejectedValue(new Error("write failed"));

        const res = await updateInvoiceGroup("grp", { description: "x" });
        expect(res).toEqual({ success: false, error: "Kunne ikke oppdatere fakturagruppen" });
    });
});

describe("deleteInvoiceGroup", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.paymentRequest.deleteMany.mockResolvedValue({ count: 2 } as never);
    });

    it("returns an error when no group can be resolved", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(null as never);
        prismaMock.paymentRequest.findFirst.mockResolvedValue(null as never);
        const res = await deleteInvoiceGroup("missing");
        expect(res).toEqual({ success: false, error: "Fant ingen fakturaer i denne gruppen." });
    });

    it("deletes all PENDING requests when none are paid and reports the count", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue({ id: "grp", title: "Cup fee", createdAt: BATCH_AT } as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            { id: "r1" }, { id: "r2" }
        ] as never);
        prismaMock.paymentRequest.count.mockResolvedValue(0 as never); // no paid

        const res = await deleteInvoiceGroup("grp");

        expect(res).toEqual({ success: true, count: 2 });
        expect(prismaMock.paymentRequest.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ["r1", "r2"] } }
        });
        expect(revalidatePath).toHaveBeenCalledWith("/admin/finance/invoices");
        expect(revalidatePath).toHaveBeenCalledWith("/admin/finance/invoices/grp");
    });

    it("blocks deletion when there are PENDING and some PAID requests", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue({ id: "grp", title: "Cup fee", createdAt: BATCH_AT } as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([{ id: "r1" }] as never); // one pending exists
        prismaMock.paymentRequest.count.mockResolvedValue(1 as never); // paidCount > 0

        const res = await deleteInvoiceGroup("grp");

        expect(res.success).toBe(false);
        expect(res.error).toContain("noen har betalt");
        expect(prismaMock.paymentRequest.deleteMany).not.toHaveBeenCalled();
    });

    it("blocks deletion when there are NO pending but some total requests (all paid)", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue({ id: "grp", title: "Cup fee", createdAt: BATCH_AT } as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never); // no pending
        prismaMock.paymentRequest.count.mockResolvedValue(3 as never); // but 3 requests total

        const res = await deleteInvoiceGroup("grp");

        expect(res.success).toBe(false);
        expect(res.error).toContain("alle fakturaer er betalt");
        expect(prismaMock.paymentRequest.deleteMany).not.toHaveBeenCalled();
    });

    it("returns the 'no invoices' error when there are no pending and no total requests", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue({ id: "grp", title: "Cup fee", createdAt: BATCH_AT } as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        prismaMock.paymentRequest.count.mockResolvedValue(0 as never);

        const res = await deleteInvoiceGroup("grp");

        expect(res).toEqual({ success: false, error: "Fant ingen fakturaer i denne gruppen." });
        expect(prismaMock.paymentRequest.deleteMany).not.toHaveBeenCalled();
    });

    it("returns a failure result when a query throws", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue({ id: "grp", title: "Cup fee", createdAt: BATCH_AT } as never);
        prismaMock.paymentRequest.findMany.mockRejectedValue(new Error("boom"));
        const res = await deleteInvoiceGroup("grp");
        expect(res).toEqual({ success: false, error: "Kunne ikke slette fakturagruppen" });
    });
});

describe("getInvoices", () => {
    it("returns all requests (no filters) with amounts converted to numbers and a 100 cap", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            makePaymentRequest({ id: "r1", amount: 123.45, member: { id: "m1", firstName: "A", lastName: "A" } })
        ] as never);

        const res = await getInvoices();

        expect(res.success).toBe(true);
        expect(res.requests).toHaveLength(1);
        expect(typeof res.requests![0].amount).toBe("number");
        expect(res.requests![0].amount).toBeCloseTo(123.45, 5);
        expect(prismaMock.paymentRequest.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: {}, take: 100, orderBy: { createdAt: "desc" } })
        );
    });

    it("filters by memberId", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        await getInvoices({ memberId: "m9" });
        expect(prismaMock.paymentRequest.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { memberId: "m9" } })
        );
    });

    it("filters by status", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        await getInvoices({ status: "PAID" as never });
        expect(prismaMock.paymentRequest.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { status: "PAID" } })
        );
    });

    it("builds a case-insensitive OR search across title/description/member names", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        await getInvoices({ search: "ola" });
        const arg = prismaMock.paymentRequest.findMany.mock.calls[0][0] as {
            where: { OR: unknown[] };
        };
        expect(arg.where.OR).toHaveLength(4);
        expect(arg.where.OR).toEqual(
            expect.arrayContaining([
                { title: { contains: "ola", mode: "insensitive" } },
                { description: { contains: "ola", mode: "insensitive" } },
                { member: { firstName: { contains: "ola", mode: "insensitive" } } },
                { member: { lastName: { contains: "ola", mode: "insensitive" } } }
            ])
        );
    });

    it("combines memberId, status and search filters", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        await getInvoices({ memberId: "m1", status: "PENDING" as never, search: "cup" });
        const arg = prismaMock.paymentRequest.findMany.mock.calls[0][0] as {
            where: { memberId: string; status: string; OR: unknown[] };
        };
        expect(arg.where.memberId).toBe("m1");
        expect(arg.where.status).toBe("PENDING");
        expect(arg.where.OR).toHaveLength(4);
    });

    it("returns a failure result when the query throws", async () => {
        prismaMock.paymentRequest.findMany.mockRejectedValue(new Error("boom"));
        const res = await getInvoices();
        expect(res).toEqual({ success: false, error: "Kunne ikke hente fakturaer" });
    });
});

describe("deleteMultipleInvoices", () => {
    beforeEach(() => {
        loginAsAdmin();
    });

    it("blocks deletion when any selected invoice is PAID", async () => {
        prismaMock.paymentRequest.count.mockResolvedValue(2 as never);
        const res = await deleteMultipleInvoices(["a", "b", "c"]);
        expect(res.success).toBe(false);
        expect(res.error).toContain("2");
        expect(prismaMock.paymentRequest.deleteMany).not.toHaveBeenCalled();
        // It checks specifically for PAID status against the given ids.
        expect(prismaMock.paymentRequest.count).toHaveBeenCalledWith({
            where: { id: { in: ["a", "b", "c"] }, status: "PAID" }
        });
    });

    it("deletes when none are paid and reports the deleted count, then revalidates", async () => {
        prismaMock.paymentRequest.count.mockResolvedValue(0 as never);
        prismaMock.paymentRequest.deleteMany.mockResolvedValue({ count: 3 } as never);

        const res = await deleteMultipleInvoices(["a", "b", "c"]);

        expect(res).toEqual({ success: true, count: 3 });
        expect(prismaMock.paymentRequest.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ["a", "b", "c"] } }
        });
        expect(revalidatePath).toHaveBeenCalledWith("/admin/finance/invoices");
    });

    it("handles an empty id list (nothing paid, nothing deleted)", async () => {
        prismaMock.paymentRequest.count.mockResolvedValue(0 as never);
        prismaMock.paymentRequest.deleteMany.mockResolvedValue({ count: 0 } as never);
        const res = await deleteMultipleInvoices([]);
        expect(res).toEqual({ success: true, count: 0 });
    });

    it("returns a failure result when the delete throws", async () => {
        prismaMock.paymentRequest.count.mockResolvedValue(0 as never);
        prismaMock.paymentRequest.deleteMany.mockRejectedValue(new Error("boom"));
        const res = await deleteMultipleInvoices(["a"]);
        expect(res).toEqual({ success: false, error: "Kunne ikke slette fakturaer." });
    });
});

// invoices.ts now enforces an ADMIN guard at the top of every exported function.
// A non-admin caller is rejected with { success: false, error: "Unauthorized" }
// before any DB access happens.
describe("authorization behavior", () => {
    it("getInvoiceGroups rejects a plain member with Unauthorized and never queries", async () => {
        loginAsMember();
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        const res = await getInvoiceGroups();
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        // The guard short-circuits before any query runs.
        expect(prismaMock.paymentRequest.findMany).not.toHaveBeenCalled();
    });

    it("getInvoiceGroupDetails rejects a plain member with Unauthorized and never resolves the group", async () => {
        loginAsMember();
        const res = await getInvoiceGroupDetails("grp");
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.paymentRequest.findUnique).not.toHaveBeenCalled();
    });

    it("updateInvoiceGroup rejects a plain member with Unauthorized before validation or DB access", async () => {
        loginAsMember();
        // Even an invalid (negative) amount must not produce the validation error:
        // the auth guard runs first.
        const res = await updateInvoiceGroup("grp", { amount: -1 });
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.paymentRequest.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.paymentRequest.updateMany).not.toHaveBeenCalled();
    });

    it("deleteInvoiceGroup rejects a plain member with Unauthorized and never resolves the group", async () => {
        loginAsMember();
        const res = await deleteInvoiceGroup("grp");
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.paymentRequest.findUnique).not.toHaveBeenCalled();
    });

    it("getInvoices rejects a plain member with Unauthorized and never queries", async () => {
        loginAsMember();
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        const res = await getInvoices();
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.paymentRequest.findMany).not.toHaveBeenCalled();
    });

    it("deleteMultipleInvoices rejects a plain member with Unauthorized and never touches the database", async () => {
        loginAsMember();
        prismaMock.paymentRequest.count.mockResolvedValue(0 as never);
        prismaMock.paymentRequest.deleteMany.mockResolvedValue({ count: 1 } as never);
        const res = await deleteMultipleInvoices(["a"]);
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.paymentRequest.count).not.toHaveBeenCalled();
        expect(prismaMock.paymentRequest.deleteMany).not.toHaveBeenCalled();
    });

    it("getInvoiceFormData returns empty members/events lists for a non-admin", async () => {
        loginAsMember();
        const res = await getInvoiceFormData();
        expect(res).toEqual({ members: [], events: [] });
        expect(prismaMock.member.findMany).not.toHaveBeenCalled();
        expect(prismaMock.event.findMany).not.toHaveBeenCalled();
    });
});
