import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { dec, makePaymentRequest, makeMember } from "../../helpers/fixtures";
import { loginAsMember, loginAsAdmin } from "../../helpers/auth";
import { revalidatePath } from "next/cache";

// Notifications are exercised in their own suite; stub them here as async fns
// because callers may chain .catch(...) on the returned promise.
vi.mock("@/server/actions/notifications", () => ({
    createNotification: vi.fn(async () => undefined),
    createManyNotifications: vi.fn(async () => undefined),
    createNotificationsForMembers: vi.fn(async () => undefined),
    broadcastNotification: vi.fn(async () => undefined),
    notifyNewPhotos: vi.fn(async () => undefined),
    sendInvoiceDeadlineReminders: vi.fn(async () => undefined)
}));

import {
    createPaymentRequest,
    createBulkPaymentRequests,
    getMemberPaymentRequests,
    getAllPendingRequests
} from "@/server/actions/payment-requests";
import { createNotificationsForMembers } from "@/server/actions/notifications";

describe("createBulkPaymentRequests", () => {
    beforeEach(() => {
        prismaMock.paymentRequest.createMany.mockResolvedValue({ count: 1 } as never);
        // Default notification result the action passes back to the caller.
        vi.mocked(createNotificationsForMembers).mockResolvedValue(undefined as never);
    });

    it("creates one PENDING request per recipient and reports the count", async () => {
        const res = await createBulkPaymentRequests({
            title: "Cup deltakeravgift",
            amount: 500,
            memberIds: ["m1", "m2", "m3"],
            category: "OTHER" as never
        });

        expect(res.success).toBe(true);
        expect(res.count).toBe(3);
        expect(prismaMock.paymentRequest.createMany).toHaveBeenCalledTimes(1);

        const arg = prismaMock.paymentRequest.createMany.mock.calls[0][0] as {
            data: Array<Record<string, unknown>>;
        };
        expect(arg.data).toHaveLength(3);
        // Every row carries the shared shape and a PENDING status.
        for (const row of arg.data) {
            expect(row).toMatchObject({
                title: "Cup deltakeravgift",
                amount: 500,
                category: "OTHER",
                status: "PENDING"
            });
            expect(row.createdAt).toBeInstanceOf(Date);
        }
        expect(arg.data.map((r) => r.memberId)).toEqual(["m1", "m2", "m3"]);
    });

    it("stamps every row in the batch with the same createdAt", async () => {
        await createBulkPaymentRequests({
            title: "Batch",
            amount: 100,
            memberIds: ["a", "b", "c", "d"],
            category: "OTHER" as never
        });

        const arg = prismaMock.paymentRequest.createMany.mock.calls[0][0] as {
            data: Array<{ createdAt: Date }>;
        };
        const stamps = arg.data.map((r) => r.createdAt.getTime());
        expect(new Set(stamps).size).toBe(1);
    });

    it("deduplicates repeated member ids before creating requests", async () => {
        const res = await createBulkPaymentRequests({
            title: "Dupes",
            amount: 250,
            memberIds: ["m1", "m1", "m2", "m2", "m2"],
            category: "OTHER" as never
        });

        expect(res.success).toBe(true);
        expect(res.count).toBe(2);

        const arg = prismaMock.paymentRequest.createMany.mock.calls[0][0] as {
            data: Array<{ memberId: string }>;
        };
        expect(arg.data.map((r) => r.memberId)).toEqual(["m1", "m2"]);

        // Notifications go to the deduplicated set, not the raw list.
        expect(createNotificationsForMembers).toHaveBeenCalledWith(
            expect.objectContaining({ memberIds: ["m1", "m2"], type: "INVOICE_CREATED" })
        );
    });

    it("drops falsy member ids before deduplication", async () => {
        const res = await createBulkPaymentRequests({
            title: "Filtered",
            amount: 250,
            memberIds: ["m1", "", "m2", ""] as never,
            category: "OTHER" as never
        });

        expect(res.success).toBe(true);
        expect(res.count).toBe(2);
        const arg = prismaMock.paymentRequest.createMany.mock.calls[0][0] as {
            data: Array<{ memberId: string }>;
        };
        expect(arg.data.map((r) => r.memberId)).toEqual(["m1", "m2"]);
    });

    it("returns an error and skips the write when no recipients remain", async () => {
        const res = await createBulkPaymentRequests({
            title: "Nobody",
            amount: 100,
            memberIds: [],
            category: "OTHER" as never
        });

        expect(res).toEqual({ success: false, error: "Du må velge minst én mottaker" });
        expect(prismaMock.paymentRequest.createMany).not.toHaveBeenCalled();
        expect(createNotificationsForMembers).not.toHaveBeenCalled();
    });

    it("returns an error when every recipient id is falsy", async () => {
        const res = await createBulkPaymentRequests({
            title: "All empty",
            amount: 100,
            memberIds: ["", ""] as never,
            category: "OTHER" as never
        });

        expect(res.success).toBe(false);
        expect(prismaMock.paymentRequest.createMany).not.toHaveBeenCalled();
    });

    it("rejects a negative amount before touching the database", async () => {
        const res = await createBulkPaymentRequests({
            title: "Bad",
            amount: -1,
            memberIds: ["m1"],
            category: "OTHER" as never
        });

        expect(res.success).toBe(false);
        expect(res.error).toBe("Beløp må være et gyldig tall på minst 0,00");
        expect(prismaMock.paymentRequest.createMany).not.toHaveBeenCalled();
    });

    it("rejects a non-finite amount (NaN) before touching the database", async () => {
        const res = await createBulkPaymentRequests({
            title: "NaN",
            amount: Number.NaN,
            memberIds: ["m1"],
            category: "OTHER" as never
        });

        expect(res.success).toBe(false);
        expect(prismaMock.paymentRequest.createMany).not.toHaveBeenCalled();
    });

    it("accepts a zero amount", async () => {
        const res = await createBulkPaymentRequests({
            title: "Free",
            amount: 0,
            memberIds: ["m1"],
            category: "OTHER" as never
        });

        expect(res.success).toBe(true);
        const arg = prismaMock.paymentRequest.createMany.mock.calls[0][0] as {
            data: Array<{ amount: number }>;
        };
        expect(arg.data[0].amount).toBe(0);
    });

    it("rounds the amount to two decimals before persisting", async () => {
        await createBulkPaymentRequests({
            title: "Rounding",
            amount: 199.999,
            memberIds: ["m1"],
            category: "OTHER" as never
        });

        const arg = prismaMock.paymentRequest.createMany.mock.calls[0][0] as {
            data: Array<{ amount: number }>;
        };
        expect(arg.data[0].amount).toBe(200);
    });

    it("uses the same rounded amount in the notification message", async () => {
        await createBulkPaymentRequests({
            title: "MsgRound",
            amount: 12.005,
            memberIds: ["m1"],
            category: "OTHER" as never
        });

        const notifArg = vi.mocked(createNotificationsForMembers).mock.calls[0][0] as {
            message: string;
        };
        // 12.005 rounds to 12.01; nb-NO formats with a comma and two decimals.
        expect(notifArg.message).toContain("12,01");
    });

    it("labels MEMBERSHIP_FEE requests differently from other invoices", async () => {
        await createBulkPaymentRequests({
            title: "Juni",
            amount: 750,
            memberIds: ["m1"],
            category: "MEMBERSHIP_FEE" as never
        });

        const notifArg = vi.mocked(createNotificationsForMembers).mock.calls[0][0] as {
            title: string;
            link: string;
        };
        expect(notifArg.title).toBe("Ny Medlemskontingent: Juni");
        expect(notifArg.link).toBe("/invoices");
    });

    it("uses the Faktura label for non-membership categories", async () => {
        await createBulkPaymentRequests({
            title: "Bot",
            amount: 100,
            memberIds: ["m1"],
            category: "OTHER" as never
        });

        const notifArg = vi.mocked(createNotificationsForMembers).mock.calls[0][0] as {
            title: string;
        };
        expect(notifArg.title).toBe("Ny Faktura: Bot");
    });

    it("revalidates the income admin page after a successful batch", async () => {
        await createBulkPaymentRequests({
            title: "Revalidate",
            amount: 100,
            memberIds: ["m1"],
            category: "OTHER" as never
        });
        expect(revalidatePath).toHaveBeenCalledWith("/admin/finance/income");
    });

    it("returns the notification result alongside the count", async () => {
        vi.mocked(createNotificationsForMembers).mockResolvedValue({ sent: 2 } as never);
        const res = await createBulkPaymentRequests({
            title: "WithNotifResult",
            amount: 100,
            memberIds: ["m1", "m2"],
            category: "OTHER" as never
        });
        expect(res.success).toBe(true);
        expect(res.notifications).toEqual({ sent: 2 });
        expect(res.count).toBe(2);
    });

    it("returns a failure when the bulk write throws", async () => {
        prismaMock.paymentRequest.createMany.mockRejectedValue(new Error("db down") as never);
        const res = await createBulkPaymentRequests({
            title: "Boom",
            amount: 100,
            memberIds: ["m1"],
            category: "OTHER" as never
        });
        expect(res).toEqual({ success: false, error: "Failed to create bulk requests" });
    });
});

// The admin-only guard is now enforced inside the action: ensureMember() runs
// first and a non-ADMIN caller is rejected before any DB write or notification.
describe("payment-request admin guards", () => {
    beforeEach(() => {
        // Keep the createMany mock benign so that, if the guard ever regressed,
        // the action would otherwise succeed — making the guard the only thing
        // that prevents a write here.
        prismaMock.paymentRequest.createMany.mockResolvedValue({ count: 1 } as never);
        prismaMock.paymentRequest.create.mockResolvedValue(
            makePaymentRequest({ id: "single" }) as never
        );
    });

    it("rejects createBulkPaymentRequests for a non-admin without writing", async () => {
        loginAsMember();

        const res = await createBulkPaymentRequests({
            title: "Sneaky bulk",
            amount: 500,
            memberIds: ["m1", "m2", "m3"],
            category: "OTHER" as never
        });

        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.paymentRequest.createMany).not.toHaveBeenCalled();
        expect(createNotificationsForMembers).not.toHaveBeenCalled();
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("rejects createPaymentRequest for a non-admin without writing", async () => {
        loginAsMember();

        const res = await createPaymentRequest({
            title: "Sneaky single",
            amount: 500,
            memberId: "m1",
            category: "OTHER" as never
        });

        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.paymentRequest.create).not.toHaveBeenCalled();
        expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("returns an empty list from getAllPendingRequests for a non-admin", async () => {
        loginAsMember();

        const result = await getAllPendingRequests();

        expect(result).toEqual([]);
        // The guard short-circuits before the query runs.
        expect(prismaMock.paymentRequest.findMany).not.toHaveBeenCalled();
    });

    it("still allows the default admin caller to create a bulk batch", async () => {
        // Explicit admin login proves the guard passes for ADMIN (the default).
        loginAsAdmin();

        const res = await createBulkPaymentRequests({
            title: "Allowed bulk",
            amount: 100,
            memberIds: ["m1", "m2"],
            category: "OTHER" as never
        });

        expect(res.success).toBe(true);
        expect(prismaMock.paymentRequest.createMany).toHaveBeenCalledTimes(1);
    });
});

describe("getMemberPaymentRequests", () => {
    it("returns the member's requests ordered newest-first with numeric amounts", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            makePaymentRequest({ id: "r1", memberId: "m1", amount: dec(750) }),
            makePaymentRequest({ id: "r2", memberId: "m1", amount: dec(199.5) })
        ] as never);

        const res = await getMemberPaymentRequests("m1");

        expect(res.success).toBe(true);
        expect(prismaMock.paymentRequest.findMany).toHaveBeenCalledWith({
            where: { memberId: "m1" },
            orderBy: { createdAt: "desc" }
        });
        // Decimal amounts converted to plain numbers.
        expect(res.data).toHaveLength(2);
        expect(res.data?.[0]).toMatchObject({ id: "r1", amount: 750 });
        expect(res.data?.[1]).toMatchObject({ id: "r2", amount: 199.5 });
        expect(typeof res.data?.[0].amount).toBe("number");
    });

    it("returns an empty data array when the member has no requests", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        const res = await getMemberPaymentRequests("lonely");
        expect(res).toEqual({ success: true, data: [] });
    });

    it("returns a failure result when the query throws", async () => {
        // A non-transient error so withPrismaRetry rethrows immediately (no backoff delay).
        prismaMock.paymentRequest.findMany.mockRejectedValue(
            new Error("Unique constraint failed") as never
        );
        const res = await getMemberPaymentRequests("m1");
        expect(res).toEqual({ success: false, error: "Failed to fetch requests" });
    });
});

describe("getAllPendingRequests", () => {
    it("fetches only PENDING requests, includes the member, and orders by due date ascending", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            makePaymentRequest({
                id: "p1",
                status: "PENDING",
                amount: dec(750),
                member: makeMember({ id: "m1" })
            })
        ] as never);

        const result = await getAllPendingRequests();

        expect(prismaMock.paymentRequest.findMany).toHaveBeenCalledWith({
            where: { status: "PENDING" },
            include: { member: true },
            orderBy: { dueDate: "asc" }
        });
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ id: "p1", amount: 750 });
    });

    it("converts every Decimal amount to a number", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            makePaymentRequest({ id: "a", amount: dec(100.25), member: makeMember() }),
            makePaymentRequest({ id: "b", amount: dec(0), member: makeMember() })
        ] as never);

        const result = await getAllPendingRequests();
        expect(result.map((r) => r.amount)).toEqual([100.25, 0]);
        for (const r of result) {
            expect(typeof r.amount).toBe("number");
        }
    });

    it("returns an empty array when there are no pending requests", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        const result = await getAllPendingRequests();
        expect(result).toEqual([]);
    });
});
