import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import {
    makeMember,
    makeAdmin,
    makePaymentRequest,
    makeTransaction,
    makeMembershipType,
    dec
} from "../../helpers/fixtures";
import { loginAsAdmin, loginAsMember, logout } from "../../helpers/auth";

// finance.ts imports these — stub with async fns (callers may chain .catch()).
vi.mock("@/server/actions/notifications", () => ({
    createNotification: vi.fn(async () => undefined),
    createManyNotifications: vi.fn(async () => undefined),
    createNotificationsForMembers: vi.fn(async () => undefined),
    broadcastNotification: vi.fn(async () => undefined),
    notifyNewPhotos: vi.fn(async () => undefined),
    sendInvoiceDeadlineReminders: vi.fn(async () => undefined)
}));

import {
    generateMonthlyFees,
    deleteMonthlyFees,
    markMonthlyFeesAsPaid,
    markMonthlyFeesAsUnpaid,
    deleteSingleInvoice,
    createFutureMonthlyFees,
    getMonthlyPaymentStatus,
    togglePaymentStatus,
    setInvoiceGroupPaymentStatus,
    setMonthlyFeePausePreference,
    getMyFinancialData,
    getCurrentMember,
    getMembersAndEvents
} from "@/server/actions/finance";
import { createNotification, createManyNotifications } from "@/server/actions/notifications";
import { revalidatePath } from "next/cache";

// -----------------------------------------------------------------------------
// generateMonthlyFees
// -----------------------------------------------------------------------------
describe("generateMonthlyFees", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.member.updateMany.mockResolvedValue({ count: 0 } as never);
        prismaMock.membershipType.findMany.mockResolvedValue([] as never);
        prismaMock.paymentRequest.createMany.mockResolvedValue({ count: 0 } as never);
    });

    it("rejects non-admin callers", async () => {
        loginAsMember();
        const res = await generateMonthlyFees(2026, 6);
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.paymentRequest.createMany).not.toHaveBeenCalled();
    });

    it("creates PENDING requests for active members and PAUSED for paused members", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            { id: "m_active", membershipType: "STANDARD", pauseMonthlyFees: false },
            { id: "m_paused", membershipType: "STANDARD", pauseMonthlyFees: true }
        ] as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        prismaMock.membershipType.findMany.mockResolvedValue([
            makeMembershipType({ name: "STANDARD", fee: 750 })
        ] as never);

        const res = await generateMonthlyFees(2026, 6);

        expect(res).toEqual({ success: true, count: 1 });
        const createArg = prismaMock.paymentRequest.createMany.mock.calls[0][0] as {
            data: Array<Record<string, unknown>>;
        };
        const pending = createArg.data.find((r) => r.memberId === "m_active");
        const paused = createArg.data.find((r) => r.memberId === "m_paused");
        expect(pending).toMatchObject({
            status: "PENDING",
            title: "Medlemskontingent 2026-06",
            amount: 750
        });
        expect(pending?.dueDate).toBeInstanceOf(Date);
        expect(paused).toMatchObject({ status: "PAUSED", dueDate: null });
        // Only PENDING members get an invoice notification.
        expect(createManyNotifications).toHaveBeenCalledTimes(1);
        const notifArg = (createManyNotifications as ReturnType<typeof vi.fn>).mock.calls[0][0] as Array<{
            memberId: string;
        }>;
        expect(notifArg).toHaveLength(1);
        expect(notifArg[0].memberId).toBe("m_active");
        expect(revalidatePath).toHaveBeenCalledWith("/admin/finance/income");
    });

    it("skips members that already have a request for this period", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            { id: "m1", membershipType: "STANDARD", pauseMonthlyFees: false }
        ] as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([{ memberId: "m1" }] as never);
        prismaMock.membershipType.findMany.mockResolvedValue([] as never);

        const res = await generateMonthlyFees(2026, 6);

        expect(res).toEqual({ success: true, count: 0 });
        expect(prismaMock.paymentRequest.createMany).not.toHaveBeenCalled();
        expect(createManyNotifications).not.toHaveBeenCalled();
    });

    it("falls back to a 750 fee when the membership type has no configured fee", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            { id: "m1", membershipType: "GOLD", pauseMonthlyFees: false }
        ] as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        prismaMock.membershipType.findMany.mockResolvedValue([] as never);

        await generateMonthlyFees(2026, 6);

        const createArg = prismaMock.paymentRequest.createMany.mock.calls[0][0] as {
            data: Array<{ amount: number }>;
        };
        expect(createArg.data[0].amount).toBe(750);
    });

    it("uses the configured membership-type fee when present", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            { id: "m1", membershipType: "PREMIUM", pauseMonthlyFees: false }
        ] as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        prismaMock.membershipType.findMany.mockResolvedValue([
            makeMembershipType({ name: "PREMIUM", fee: 1200 })
        ] as never);

        await generateMonthlyFees(2026, 6);

        const createArg = prismaMock.paymentRequest.createMany.mock.calls[0][0] as {
            data: Array<{ amount: number }>;
        };
        expect(createArg.data[0].amount).toBe(1200);
    });

    it("resets ineligible pauses (balance <= cap) before generating", async () => {
        prismaMock.member.findMany.mockResolvedValue([] as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);

        await generateMonthlyFees(2026, 6);

        expect(prismaMock.member.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    pauseMonthlyFees: true,
                    balance: { lte: 4500 }
                }),
                data: { pauseMonthlyFees: false }
            })
        );
    });

    it("returns a generic error when a query throws", async () => {
        prismaMock.member.findMany.mockRejectedValue(new Error("db down"));
        const res = await generateMonthlyFees(2026, 6);
        expect(res).toEqual({ success: false, error: "Failed to generate fees" });
    });
});

// -----------------------------------------------------------------------------
// deleteMonthlyFees
// -----------------------------------------------------------------------------
describe("deleteMonthlyFees", () => {
    beforeEach(() => loginAsAdmin());

    it("rejects non-admin callers", async () => {
        loginAsMember();
        const res = await deleteMonthlyFees(2026, 6);
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.paymentRequest.deleteMany).not.toHaveBeenCalled();
    });

    it("refuses to delete when any request in the period is already PAID", async () => {
        prismaMock.paymentRequest.count.mockResolvedValue(2 as never);
        const res = await deleteMonthlyFees(2026, 6);
        expect(res).toEqual({
            success: false,
            error: "Kan ikke slette krav. Noen medlemmer har allerede betalt."
        });
        expect(prismaMock.paymentRequest.deleteMany).not.toHaveBeenCalled();
    });

    it("deletes all requests for the period when none are PAID", async () => {
        prismaMock.paymentRequest.count.mockResolvedValue(0 as never);
        prismaMock.paymentRequest.deleteMany.mockResolvedValue({ count: 5 } as never);

        const res = await deleteMonthlyFees(2026, 6);

        expect(res).toEqual({ success: true, count: 5 });
        expect(prismaMock.paymentRequest.deleteMany).toHaveBeenCalledWith({
            where: { title: "Medlemskontingent 2026-06", category: "MEMBERSHIP_FEE" }
        });
    });

    it("returns a generic error when the count query throws", async () => {
        prismaMock.paymentRequest.count.mockRejectedValue(new Error("boom"));
        const res = await deleteMonthlyFees(2026, 6);
        expect(res).toEqual({ success: false, error: "Kunne ikke slette krav" });
    });
});

// -----------------------------------------------------------------------------
// markMonthlyFeesAsPaid
// -----------------------------------------------------------------------------
describe("markMonthlyFeesAsPaid", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.transaction.create.mockResolvedValue(makeTransaction({ id: "tx_new" }) as never);
        prismaMock.paymentRequest.update.mockResolvedValue(makePaymentRequest() as never);
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
        prismaMock.payment.upsert.mockResolvedValue({} as never);
    });

    it("rejects non-admin callers", async () => {
        loginAsMember();
        const res = await markMonthlyFeesAsPaid(2026, 6);
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("returns count 0 with a message when there are no pending requests", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        const res = await markMonthlyFeesAsPaid(2026, 6);
        expect(res).toEqual({ success: true, count: 0, message: "Ingen ubetalte krav funnet." });
        expect(prismaMock.transaction.create).not.toHaveBeenCalled();
    });

    it("creates a transaction, increments balance and upserts a PAID Payment per request", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            makePaymentRequest({
                id: "req_1",
                status: "PENDING",
                category: "MEMBERSHIP_FEE",
                amount: dec(750),
                memberId: "m1",
                member: makeMember({ id: "m1" })
            }),
            makePaymentRequest({
                id: "req_2",
                status: "PENDING",
                category: "MEMBERSHIP_FEE",
                amount: dec(750),
                memberId: "m2",
                member: makeMember({ id: "m2" })
            })
        ] as never);

        const res = await markMonthlyFeesAsPaid(2026, 6);

        expect(res).toEqual({ success: true, count: 2 });
        expect(prismaMock.transaction.create).toHaveBeenCalledTimes(2);
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { balance: { increment: dec(750) } } })
        );
        expect(prismaMock.paymentRequest.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "req_1" },
                data: expect.objectContaining({ status: "PAID", transactionId: "tx_new" })
            })
        );
        // Period derived from the year/month args -> "2026-06".
        expect(prismaMock.payment.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { memberId_period: { memberId: "m1", period: "2026-06" } }
            })
        );
        // One deposit notification batch covering both members.
        expect(createManyNotifications).toHaveBeenCalledTimes(1);
        const notifArg = (createManyNotifications as ReturnType<typeof vi.fn>).mock.calls[0][0] as Array<{
            type: string;
        }>;
        expect(notifArg).toHaveLength(2);
        expect(notifArg[0].type).toBe("BALANCE_DEPOSIT");
    });

    it("returns a generic error when the find query throws", async () => {
        prismaMock.paymentRequest.findMany.mockRejectedValue(new Error("boom"));
        const res = await markMonthlyFeesAsPaid(2026, 6);
        expect(res).toEqual({ success: false, error: "Kunne ikke oppdatere betalinger" });
    });
});

// -----------------------------------------------------------------------------
// markMonthlyFeesAsUnpaid
// -----------------------------------------------------------------------------
describe("markMonthlyFeesAsUnpaid", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.transaction.delete.mockResolvedValue(makeTransaction() as never);
        prismaMock.paymentRequest.update.mockResolvedValue(makePaymentRequest() as never);
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
        prismaMock.payment.updateMany.mockResolvedValue({ count: 1 } as never);
    });

    it("rejects non-admin callers", async () => {
        loginAsMember();
        const res = await markMonthlyFeesAsUnpaid(2026, 6);
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("returns count 0 with a message when there are no paid requests", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        const res = await markMonthlyFeesAsUnpaid(2026, 6);
        expect(res).toEqual({ success: true, count: 0, message: "Ingen betalte krav funnet." });
        expect(prismaMock.transaction.delete).not.toHaveBeenCalled();
    });

    it("voids the transaction, decrements balance, reverts request and Payment for each PAID request", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            {
                id: "req_1",
                memberId: "m1",
                amount: dec(750),
                transactionId: "tx_old"
            }
        ] as never);

        const res = await markMonthlyFeesAsUnpaid(2026, 6);

        expect(res).toEqual({ success: true, count: 1 });
        expect(prismaMock.transaction.delete).toHaveBeenCalledWith({ where: { id: "tx_old" } });
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { balance: { decrement: dec(750) } } })
        );
        expect(prismaMock.paymentRequest.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "req_1" },
                data: { status: "PENDING", transactionId: null }
            })
        );
        expect(prismaMock.payment.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { memberId: "m1", period: "2026-06" },
                data: { status: "UNPAID", amount: null, paidAt: null }
            })
        );
    });

    it("skips the transaction delete when the PAID request has no linked transaction", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            { id: "req_1", memberId: "m1", amount: dec(750), transactionId: null }
        ] as never);

        const res = await markMonthlyFeesAsUnpaid(2026, 6);

        expect(res).toEqual({ success: true, count: 1 });
        expect(prismaMock.transaction.delete).not.toHaveBeenCalled();
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { balance: { decrement: dec(750) } } })
        );
    });

    it("returns a generic error when the find query throws", async () => {
        prismaMock.paymentRequest.findMany.mockRejectedValue(new Error("boom"));
        const res = await markMonthlyFeesAsUnpaid(2026, 6);
        expect(res).toEqual({ success: false, error: "Kunne ikke oppdatere betalinger" });
    });
});

// -----------------------------------------------------------------------------
// deleteSingleInvoice
// -----------------------------------------------------------------------------
describe("deleteSingleInvoice", () => {
    beforeEach(() => loginAsAdmin());

    it("rejects non-admin callers", async () => {
        loginAsMember();
        const res = await deleteSingleInvoice("req_1");
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.paymentRequest.delete).not.toHaveBeenCalled();
    });

    it("returns a not-found error when the request does not exist", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(null as never);
        const res = await deleteSingleInvoice("missing");
        expect(res).toEqual({ success: false, error: "Fant ikke krav" });
    });

    it("blocks deleting a PAID request", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({ status: "PAID" }) as never
        );
        const res = await deleteSingleInvoice("req_paid");
        expect(res).toEqual({
            success: false,
            error: "Kan ikke slette et betalt krav. Marker som ubetalt først."
        });
        expect(prismaMock.paymentRequest.delete).not.toHaveBeenCalled();
    });

    it("deletes a PENDING request", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({ id: "req_del", status: "PENDING" }) as never
        );
        prismaMock.paymentRequest.delete.mockResolvedValue(makePaymentRequest() as never);

        const res = await deleteSingleInvoice("req_del");

        expect(res).toEqual({ success: true });
        expect(prismaMock.paymentRequest.delete).toHaveBeenCalledWith({ where: { id: "req_del" } });
        expect(revalidatePath).toHaveBeenCalledWith("/admin/finance/income");
    });

    it("allows deleting a PAUSED request", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({ id: "req_paused", status: "PAUSED" }) as never
        );
        prismaMock.paymentRequest.delete.mockResolvedValue(makePaymentRequest() as never);

        const res = await deleteSingleInvoice("req_paused");

        expect(res).toEqual({ success: true });
        expect(prismaMock.paymentRequest.delete).toHaveBeenCalledWith({ where: { id: "req_paused" } });
    });
});

// -----------------------------------------------------------------------------
// createFutureMonthlyFees
// -----------------------------------------------------------------------------
describe("createFutureMonthlyFees", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.membershipType.findUnique.mockResolvedValue(
            makeMembershipType({ name: "STANDARD", fee: 750 }) as never
        );
        prismaMock.paymentRequest.create.mockResolvedValue(makePaymentRequest() as never);
    });

    it("rejects non-admin callers", async () => {
        loginAsMember();
        const res = await createFutureMonthlyFees("m1", 2026, 7, 1);
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("returns a not-found error when the member does not exist", async () => {
        prismaMock.member.findUnique.mockResolvedValue(null as never);
        const res = await createFutureMonthlyFees("missing", 2026, 7, 1);
        expect(res).toEqual({ success: false, error: "Fant ikke medlem" });
    });

    it("creates a PENDING request for a future month and notifies the member", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m1", balance: dec(0), pauseMonthlyFees: false }) as never
        );
        prismaMock.paymentRequest.findFirst.mockResolvedValue(null as never);

        const res = await createFutureMonthlyFees("m1", 2026, 7, 1);

        expect(res).toEqual({ success: true, created: 1, skipped: 0 });
        expect(prismaMock.paymentRequest.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    title: "Medlemskontingent 2026-07",
                    status: "PENDING",
                    amount: 750,
                    memberId: "m1"
                })
            })
        );
        expect(createNotification).toHaveBeenCalledWith(
            expect.objectContaining({ memberId: "m1", type: "INVOICE_CREATED" })
        );
    });

    it("creates a range of months, rolling over the year boundary", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m1", balance: dec(0) }) as never
        );
        prismaMock.paymentRequest.findFirst.mockResolvedValue(null as never);

        const res = await createFutureMonthlyFees("m1", 2026, 12, 2);

        expect(res).toEqual({ success: true, created: 2, skipped: 0 });
        const titles = prismaMock.paymentRequest.create.mock.calls.map(
            (c) => (c[0] as { data: { title: string } }).data.title
        );
        expect(titles).toEqual(["Medlemskontingent 2026-12", "Medlemskontingent 2027-01"]);
    });

    it("skips months where a request already exists", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m1", balance: dec(0) }) as never
        );
        prismaMock.paymentRequest.findFirst
            .mockResolvedValueOnce(makePaymentRequest() as never)
            .mockResolvedValueOnce(null as never);

        const res = await createFutureMonthlyFees("m1", 2026, 7, 2);

        expect(res).toEqual({ success: true, created: 1, skipped: 1 });
        expect(prismaMock.paymentRequest.create).toHaveBeenCalledTimes(1);
    });

    it("auto-clears an ineligible pause (balance <= cap) and still creates the fee", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m1", balance: dec(1000), pauseMonthlyFees: true }) as never
        );
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
        prismaMock.paymentRequest.findFirst.mockResolvedValue(null as never);

        const res = await createFutureMonthlyFees("m1", 2026, 7, 1);

        expect(res).toEqual({ success: true, created: 1, skipped: 0 });
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { pauseMonthlyFees: false } })
        );
    });

    it("blocks creation when the member legitimately paused (balance > cap)", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m1", balance: dec(5000), pauseMonthlyFees: true }) as never
        );

        const res = await createFutureMonthlyFees("m1", 2026, 7, 1);

        expect(res.success).toBe(false);
        expect(res.error).toContain("pauset");
        expect(prismaMock.paymentRequest.create).not.toHaveBeenCalled();
    });

    it("falls back to a 750 fee when no membership type matches", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m1", balance: dec(0), membershipType: "UNKNOWN" }) as never
        );
        prismaMock.membershipType.findUnique.mockResolvedValue(null as never);
        prismaMock.paymentRequest.findFirst.mockResolvedValue(null as never);

        await createFutureMonthlyFees("m1", 2026, 7, 1);

        expect(prismaMock.paymentRequest.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ amount: 750 }) })
        );
    });

    it("returns a generic error when a query throws", async () => {
        prismaMock.member.findUnique.mockRejectedValue(new Error("boom"));
        const res = await createFutureMonthlyFees("m1", 2026, 7, 1);
        expect(res).toEqual({ success: false, error: "Kunne ikke opprette krav" });
    });
});

// -----------------------------------------------------------------------------
// getMonthlyPaymentStatus
// -----------------------------------------------------------------------------
describe("getMonthlyPaymentStatus", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.member.updateMany.mockResolvedValue({ count: 0 } as never);
    });

    it("throws Unauthorized for non-admin callers", async () => {
        loginAsMember();
        await expect(getMonthlyPaymentStatus(2026, 6)).rejects.toThrow("Kunne ikke hente betalingsstatus");
    });

    it("aggregates stats for the current period and reports the three period titles", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            {
                id: "m1",
                firstName: "Anna",
                lastName: "Berg",
                avatarUrl: null,
                membershipType: "STANDARD",
                pauseMonthlyFees: false,
                paymentRequests: [
                    {
                        id: "r1",
                        title: "Medlemskontingent 2026-06",
                        amount: dec(750),
                        status: "PAID"
                    }
                ]
            },
            {
                id: "m2",
                firstName: "Bjorn",
                lastName: "Dahl",
                avatarUrl: null,
                membershipType: "STANDARD",
                pauseMonthlyFees: false,
                paymentRequests: [
                    {
                        id: "r2",
                        title: "Medlemskontingent 2026-06",
                        amount: dec(750),
                        status: "PENDING"
                    }
                ]
            }
        ] as never);

        const res = await getMonthlyPaymentStatus(2026, 6);

        expect(res.periods).toEqual([
            "Medlemskontingent 2026-06",
            "Medlemskontingent 2026-05",
            "Medlemskontingent 2026-04"
        ]);
        expect(res.stats).toEqual({
            totalCollected: 750,
            expectedTotal: 1500,
            missing: 750,
            paidCount: 1,
            totalCount: 2,
            percentage: 50
        });
        expect(res.members[0].history["Medlemskontingent 2026-06"]).toEqual({
            status: "PAID",
            id: "r1",
            amount: 750
        });
    });

    it("excludes PAUSED requests from the current-period totals", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            {
                id: "m1",
                firstName: "Anna",
                lastName: "Berg",
                avatarUrl: null,
                membershipType: "STANDARD",
                pauseMonthlyFees: true,
                paymentRequests: [
                    {
                        id: "r1",
                        title: "Medlemskontingent 2026-06",
                        amount: dec(750),
                        status: "PAUSED"
                    }
                ]
            }
        ] as never);

        const res = await getMonthlyPaymentStatus(2026, 6);

        expect(res.stats.totalCount).toBe(0);
        expect(res.stats.expectedTotal).toBe(0);
        expect(res.stats.percentage).toBe(0);
    });

    it("handles members with no requests (history is null, percentage 0)", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            {
                id: "m1",
                firstName: null,
                lastName: null,
                avatarUrl: null,
                membershipType: "STANDARD",
                pauseMonthlyFees: false,
                paymentRequests: []
            }
        ] as never);

        const res = await getMonthlyPaymentStatus(2026, 6);

        expect(res.members[0].name).toBe("Ukjent Navn");
        expect(res.members[0].history["Medlemskontingent 2026-06"]).toBeNull();
        expect(res.stats.percentage).toBe(0);
    });
});

// -----------------------------------------------------------------------------
// togglePaymentStatus
// -----------------------------------------------------------------------------
describe("togglePaymentStatus", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.transaction.create.mockResolvedValue(makeTransaction({ id: "tx_new" }) as never);
        prismaMock.transaction.delete.mockResolvedValue(makeTransaction() as never);
        prismaMock.paymentRequest.update.mockResolvedValue(makePaymentRequest() as never);
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
        prismaMock.payment.upsert.mockResolvedValue({} as never);
        prismaMock.payment.updateMany.mockResolvedValue({ count: 1 } as never);
    });

    it("rejects non-admin callers", async () => {
        loginAsMember();
        const res = await togglePaymentStatus("req_1");
        expect(res).toEqual({ success: false, error: "Failed to toggle status" });
    });

    it("returns an error when the request is not found", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(null as never);
        const res = await togglePaymentStatus("missing");
        expect(res).toEqual({ success: false, error: "Failed to toggle status" });
    });

    it("refuses to toggle a PAUSED request", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({ status: "PAUSED", transaction: null }) as never
        );
        const res = await togglePaymentStatus("req_paused");
        // The PAUSED guard throws "Kan ikke endre status på et pauset krav", caught and
        // surfaced as the generic toggle failure.
        expect(res).toEqual({ success: false, error: "Failed to toggle status" });
        expect(prismaMock.transaction.create).not.toHaveBeenCalled();
        expect(prismaMock.transaction.delete).not.toHaveBeenCalled();
    });

    it("PENDING -> PAID: delegates to markRequestAsPaid (creates tx, increments balance)", async () => {
        // togglePaymentStatus fetches with { include: { transaction } }; markRequestAsPaid
        // re-fetches with { include: { member } }. Both reads hit prismaMock.findUnique.
        prismaMock.paymentRequest.findUnique
            .mockResolvedValueOnce(
                makePaymentRequest({
                    id: "req_1",
                    status: "PENDING",
                    category: "MEMBERSHIP_FEE",
                    amount: dec(750),
                    dueDate: new Date("2026-06-30T00:00:00.000Z"),
                    memberId: "m1",
                    transaction: null
                }) as never
            )
            .mockResolvedValueOnce(
                makePaymentRequest({
                    id: "req_1",
                    status: "PENDING",
                    category: "MEMBERSHIP_FEE",
                    amount: dec(750),
                    dueDate: new Date("2026-06-30T00:00:00.000Z"),
                    memberId: "m1",
                    member: makeMember({ id: "m1" })
                }) as never
            );

        const res = await togglePaymentStatus("req_1");

        expect(res).toEqual({ success: true });
        expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { balance: { increment: 750 } } })
        );
        expect(prismaMock.paymentRequest.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: "PAID" }) })
        );
    });

    it("PAID -> PENDING: voids the transaction, decrements balance and reverts the Payment", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({
                id: "req_1",
                status: "PAID",
                category: "MEMBERSHIP_FEE",
                amount: dec(750),
                dueDate: new Date("2026-06-30T00:00:00.000Z"),
                transactionId: "tx_old",
                memberId: "m1",
                transaction: makeTransaction({ id: "tx_old" })
            }) as never
        );

        const res = await togglePaymentStatus("req_1");

        expect(res).toEqual({ success: true });
        expect(prismaMock.transaction.delete).toHaveBeenCalledWith({ where: { id: "tx_old" } });
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { balance: { decrement: dec(750) } } })
        );
        expect(prismaMock.paymentRequest.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "req_1" },
                data: { status: "PENDING", transactionId: null }
            })
        );
        expect(prismaMock.payment.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { memberId: "m1", period: "2026-06" },
                data: { status: "UNPAID", amount: null, paidAt: null }
            })
        );
    });

    it("PAID -> PENDING for a non-membership-fee: no Payment summary revert", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({
                id: "req_1",
                status: "PAID",
                category: "OTHER",
                amount: dec(500),
                dueDate: new Date("2026-06-30T00:00:00.000Z"),
                transactionId: "tx_old",
                memberId: "m1",
                transaction: makeTransaction({ id: "tx_old" })
            }) as never
        );

        const res = await togglePaymentStatus("req_1");

        expect(res).toEqual({ success: true });
        expect(prismaMock.transaction.delete).toHaveBeenCalled();
        expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
    });

    it("PAID -> PENDING without a linked transaction: still decrements balance", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({
                id: "req_1",
                status: "PAID",
                category: "MEMBERSHIP_FEE",
                amount: dec(750),
                dueDate: new Date("2026-06-30T00:00:00.000Z"),
                transactionId: null,
                memberId: "m1",
                transaction: null
            }) as never
        );

        const res = await togglePaymentStatus("req_1");

        expect(res).toEqual({ success: true });
        expect(prismaMock.transaction.delete).not.toHaveBeenCalled();
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { balance: { decrement: dec(750) } } })
        );
    });
});

// -----------------------------------------------------------------------------
// setInvoiceGroupPaymentStatus
// -----------------------------------------------------------------------------
describe("setInvoiceGroupPaymentStatus", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.transaction.create.mockResolvedValue(makeTransaction({ id: "tx_new" }) as never);
        prismaMock.transaction.delete.mockResolvedValue(makeTransaction() as never);
        prismaMock.paymentRequest.update.mockResolvedValue(makePaymentRequest() as never);
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
        prismaMock.payment.upsert.mockResolvedValue({} as never);
        prismaMock.payment.updateMany.mockResolvedValue({ count: 1 } as never);
    });

    it("rejects non-admin callers", async () => {
        loginAsMember();
        const res = await setInvoiceGroupPaymentStatus({ groupId: "g1", targetStatus: "PAID" });
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("returns an error when the group anchor invoice is missing", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(null as never);
        const res = await setInvoiceGroupPaymentStatus({ groupId: "missing", targetStatus: "PAID" });
        expect(res).toEqual({ success: false, error: "Fant ingen fakturaer i denne gruppen." });
    });

    it("returns updated/total 0 when no requests match the source status", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue({
            id: "g1",
            title: "Medlemskontingent 2026-06",
            createdAt: new Date("2026-06-01T00:00:00.000Z")
        } as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);

        const res = await setInvoiceGroupPaymentStatus({ groupId: "g1", targetStatus: "PAID" });

        expect(res).toEqual({ success: true, updatedCount: 0, totalCount: 0 });
    });

    it("PAID target: creates a transaction, increments balance and upserts the Payment per member", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue({
            id: "g1",
            title: "Medlemskontingent 2026-06",
            createdAt: new Date("2026-06-01T00:00:00.000Z")
        } as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            {
                id: "r1",
                title: "Medlemskontingent 2026-06",
                amount: dec(750),
                memberId: "m1",
                eventId: null,
                dueDate: new Date("2026-06-30T00:00:00.000Z"),
                category: "MEMBERSHIP_FEE",
                transactionId: null
            }
        ] as never);

        const res = await setInvoiceGroupPaymentStatus({ groupId: "g1", targetStatus: "PAID" });

        expect(res).toEqual({ success: true, updatedCount: 1, totalCount: 1 });
        // Source status for a PAID target is PENDING.
        expect(prismaMock.paymentRequest.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ status: "PENDING" })
            })
        );
        expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { balance: { increment: dec(750) } } })
        );
        expect(prismaMock.payment.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { memberId_period: { memberId: "m1", period: "2026-06" } }
            })
        );
        expect(createManyNotifications).toHaveBeenCalledTimes(1);
    });

    it("PENDING target: voids the transaction, decrements balance and reverts the Payment", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue({
            id: "g1",
            title: "Medlemskontingent 2026-06",
            createdAt: new Date("2026-06-01T00:00:00.000Z")
        } as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            {
                id: "r1",
                title: "Medlemskontingent 2026-06",
                amount: dec(750),
                memberId: "m1",
                eventId: null,
                dueDate: new Date("2026-06-30T00:00:00.000Z"),
                category: "MEMBERSHIP_FEE",
                transactionId: "tx_old"
            }
        ] as never);

        const res = await setInvoiceGroupPaymentStatus({ groupId: "g1", targetStatus: "PENDING" });

        expect(res).toEqual({ success: true, updatedCount: 1, totalCount: 1 });
        // Source status for a PENDING target is PAID.
        expect(prismaMock.paymentRequest.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ status: "PAID" })
            })
        );
        expect(prismaMock.transaction.delete).toHaveBeenCalledWith({ where: { id: "tx_old" } });
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { balance: { decrement: dec(750) } } })
        );
        expect(prismaMock.payment.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { memberId: "m1", period: "2026-06" },
                data: { status: "UNPAID", amount: null, paidAt: null }
            })
        );
        // No deposit notifications are pushed for an "unpay" operation.
        expect(createManyNotifications).not.toHaveBeenCalled();
    });

    it("PAID target for a non-membership-fee: skips the Payment summary upsert", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue({
            id: "g1",
            title: "Cup fee",
            createdAt: new Date("2026-06-01T00:00:00.000Z")
        } as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            {
                id: "r1",
                title: "Cup fee",
                amount: dec(300),
                memberId: "m1",
                eventId: null,
                dueDate: null,
                category: "OTHER",
                transactionId: null
            }
        ] as never);

        const res = await setInvoiceGroupPaymentStatus({ groupId: "g1", targetStatus: "PAID" });

        expect(res).toEqual({ success: true, updatedCount: 1, totalCount: 1 });
        expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
        expect(prismaMock.payment.upsert).not.toHaveBeenCalled();
    });

    it("returns a generic error when the anchor lookup throws", async () => {
        prismaMock.paymentRequest.findUnique.mockRejectedValue(new Error("boom"));
        const res = await setInvoiceGroupPaymentStatus({ groupId: "g1", targetStatus: "PAID" });
        expect(res).toEqual({
            success: false,
            error: "Kunne ikke oppdatere fakturastatus for gruppen."
        });
    });
});

// -----------------------------------------------------------------------------
// setMonthlyFeePausePreference
// -----------------------------------------------------------------------------
describe("setMonthlyFeePausePreference", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
        prismaMock.paymentRequest.updateMany.mockResolvedValue({ count: 1 } as never);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("enables the pause and converts the current PENDING request to PAUSED when balance > cap", async () => {
        loginAsMember({ id: "m1", balance: dec(5000), pauseMonthlyFees: false });

        const res = await setMonthlyFeePausePreference(true);

        expect(res).toMatchObject({ success: true, enabled: true, eligible: true, cap: 4500 });
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { pauseMonthlyFees: true } })
        );
        expect(prismaMock.paymentRequest.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    memberId: "m1",
                    title: "Medlemskontingent 2026-06",
                    status: "PENDING"
                }),
                data: expect.objectContaining({ status: "PAUSED", dueDate: null })
            })
        );
    });

    it("refuses to enable the pause when balance is at or below the cap", async () => {
        loginAsMember({ id: "m1", balance: dec(4500), pauseMonthlyFees: false });

        const res = await setMonthlyFeePausePreference(true);

        expect(res).toMatchObject({
            success: false,
            enabled: false,
            eligible: false,
            cap: 4500,
            balance: 4500
        });
        expect(res.error).toContain("4500");
        // No pause flag flip happens (it was already false).
        expect(prismaMock.member.update).not.toHaveBeenCalled();
    });

    it("force-clears a stale pause flag when an ineligible member tries to re-enable", async () => {
        loginAsMember({ id: "m1", balance: dec(1000), pauseMonthlyFees: true });

        const res = await setMonthlyFeePausePreference(true);

        expect(res.success).toBe(false);
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { pauseMonthlyFees: false } })
        );
    });

    it("disables the pause and converts the current PAUSED request back to PENDING", async () => {
        loginAsMember({ id: "m1", balance: dec(5000), pauseMonthlyFees: true });

        const res = await setMonthlyFeePausePreference(false);

        expect(res).toMatchObject({ success: true, enabled: false });
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { pauseMonthlyFees: false } })
        );
        expect(prismaMock.paymentRequest.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ status: "PAUSED" }),
                data: expect.objectContaining({ status: "PENDING" })
            })
        );
        const updateArg = prismaMock.paymentRequest.updateMany.mock.calls[0][0] as {
            data: { dueDate: Date };
        };
        expect(updateArg.data.dueDate).toBeInstanceOf(Date);
    });

    it("is a no-op on the member flag when the desired state already matches", async () => {
        loginAsMember({ id: "m1", balance: dec(100), pauseMonthlyFees: false });

        const res = await setMonthlyFeePausePreference(false);

        expect(res).toMatchObject({ success: true, enabled: false });
        expect(prismaMock.member.update).not.toHaveBeenCalled();
        expect(prismaMock.paymentRequest.updateMany).not.toHaveBeenCalled();
    });

    it("returns a generic error when the update throws", async () => {
        loginAsMember({ id: "m1", balance: dec(5000), pauseMonthlyFees: false });
        prismaMock.member.update.mockRejectedValue(new Error("boom"));
        const res = await setMonthlyFeePausePreference(true);
        expect(res).toEqual({ success: false, error: "Kunne ikke oppdatere innstillingen." });
    });
});

// -----------------------------------------------------------------------------
// getMyFinancialData
// -----------------------------------------------------------------------------
describe("getMyFinancialData", () => {
    beforeEach(() => {
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
    });

    it("returns balance, pause eligibility and serialized requests/transactions", async () => {
        loginAsMember({ id: "m1", balance: dec(5000), pauseMonthlyFees: true });
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            makePaymentRequest({
                id: "r1",
                memberId: "m1",
                amount: dec(750),
                dueDate: new Date("2026-06-30T00:00:00.000Z")
            })
        ] as never);
        prismaMock.transaction.findMany.mockResolvedValue([
            makeTransaction({ id: "tx1", memberId: "m1", amount: dec(750) })
        ] as never);

        const res = await getMyFinancialData();

        expect(res.memberId).toBe("m1");
        expect(res.balance).toBe(5000);
        expect(res.monthlyFeePause).toEqual({ enabled: true, eligible: true, cap: 4500 });
        expect(res.paymentRequests[0].amount).toBe(750);
        expect(res.paymentRequests[0].dueDate).toBe("2026-06-30T00:00:00.000Z");
        expect(res.transactions[0].amount).toBe(750);
        // Eligible + already enabled -> no forced reset.
        expect(prismaMock.member.update).not.toHaveBeenCalled();
    });

    it("force-disables a stale pause when balance fell to/under the cap", async () => {
        loginAsMember({ id: "m1", balance: dec(1000), pauseMonthlyFees: true });
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
        prismaMock.transaction.findMany.mockResolvedValue([] as never);

        const res = await getMyFinancialData();

        expect(res.monthlyFeePause.enabled).toBe(false);
        expect(res.monthlyFeePause.eligible).toBe(false);
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { pauseMonthlyFees: false } })
        );
    });

    it("serializes a null dueDate as null", async () => {
        loginAsMember({ id: "m1", balance: dec(0), pauseMonthlyFees: false });
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            makePaymentRequest({ id: "r1", memberId: "m1", amount: dec(750), dueDate: null })
        ] as never);
        prismaMock.transaction.findMany.mockResolvedValue([] as never);

        const res = await getMyFinancialData();

        expect(res.paymentRequests[0].dueDate).toBeNull();
    });

    it("throws a friendly error when a query fails", async () => {
        loginAsMember({ id: "m1", balance: dec(0), pauseMonthlyFees: false });
        prismaMock.paymentRequest.findMany.mockRejectedValue(new Error("boom"));
        await expect(getMyFinancialData()).rejects.toThrow("Kunne ikke hente økonomisk data");
    });
});

// -----------------------------------------------------------------------------
// getCurrentMember
// -----------------------------------------------------------------------------
describe("getCurrentMember", () => {
    it("returns the member with a numeric balance and userRole", async () => {
        loginAsMember({ id: "m1", balance: dec(1234), userRole: null });

        const res = await getCurrentMember();

        expect(res).not.toBeNull();
        expect(res?.id).toBe("m1");
        expect(res?.balance).toBe(1234);
        expect(res).toHaveProperty("userRole", null);
    });

    it("returns null when not authenticated", async () => {
        logout();
        const res = await getCurrentMember();
        expect(res).toBeNull();
    });
});

// -----------------------------------------------------------------------------
// getMembersAndEvents
// -----------------------------------------------------------------------------
describe("getMembersAndEvents", () => {
    beforeEach(() => loginAsAdmin());

    it("returns empty lists for non-admin callers", async () => {
        loginAsMember();
        const res = await getMembersAndEvents();
        expect(res).toEqual({ members: [], events: [] });
        expect(prismaMock.member.findMany).not.toHaveBeenCalled();
    });

    it("returns active members and this-year events for admins", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            { id: "m1", firstName: "Anna", lastName: "Berg", avatarUrl: null, role: "MEMBER", createdAt: new Date() }
        ] as never);
        prismaMock.event.findMany.mockResolvedValue([
            { id: "e1", title: "Sommerfest", startAt: new Date("2026-07-01T18:00:00.000Z") }
        ] as never);

        const res = await getMembersAndEvents();

        expect(res.members).toHaveLength(1);
        expect(res.events).toHaveLength(1);
        // Active filter applied to members.
        expect(prismaMock.member.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { deletedAt: null } })
        );
    });

    it("returns empty lists when a query throws", async () => {
        prismaMock.member.findMany.mockRejectedValue(new Error("boom"));
        const res = await getMembersAndEvents();
        expect(res).toEqual({ members: [], events: [] });
    });
});
