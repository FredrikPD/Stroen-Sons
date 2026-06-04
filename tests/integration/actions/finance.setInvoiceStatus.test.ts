import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { makePaymentRequest, makeMember, makeTransaction } from "../../helpers/fixtures";
import { loginAsAdmin, loginAsMember } from "../../helpers/auth";

vi.mock("@/server/actions/notifications", () => ({
    createNotification: vi.fn(async () => undefined),
    createManyNotifications: vi.fn(async () => undefined),
    createNotificationsForMembers: vi.fn(async () => undefined)
}));

import { setInvoiceStatus } from "@/server/actions/finance";
import { createNotification } from "@/server/actions/notifications";

describe("setInvoiceStatus", () => {
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
        const res = await setInvoiceStatus("req", "PAID" as never);
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("rejects an invalid target status", async () => {
        const res = await setInvoiceStatus("req", "NONSENSE" as never);
        expect(res.success).toBe(false);
    });

    it("returns an error when the request is missing", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(null as never);
        const res = await setInvoiceStatus("missing", "PAID" as never);
        expect(res.success).toBe(false);
    });

    it("is a no-op when the status is unchanged", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({ status: "PAID", member: makeMember() }) as never
        );
        const res = await setInvoiceStatus("req", "PAID" as never);
        expect(res).toEqual({ success: true });
        expect(prismaMock.transaction.create).not.toHaveBeenCalled();
    });

    it("PAUSED -> PAID: records payment, derives the period from the title, increments balance", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({
                id: "req_paused",
                status: "PAUSED",
                category: "MEMBERSHIP_FEE",
                amount: 750,
                dueDate: null, // PAUSED fees have no due date
                title: "Medlemskontingent 2026-06",
                memberId: "m1",
                member: makeMember({ id: "m1" })
            }) as never
        );

        const res = await setInvoiceStatus("req_paused", "PAID" as never);

        expect(res.success).toBe(true);
        expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { balance: { increment: expect.anything() } } })
        );
        // Period derived from the title, not the (null) dueDate.
        expect(prismaMock.payment.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { memberId_period: { memberId: "m1", period: "2026-06" } }
            })
        );
        expect(prismaMock.paymentRequest.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: "PAID" }) })
        );
        expect(createNotification).toHaveBeenCalledWith(
            expect.objectContaining({ type: "BALANCE_DEPOSIT" })
        );
    });

    it("PAID -> PENDING: voids the transaction, decrements balance, restores due date", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({
                id: "req_paid",
                status: "PAID",
                category: "MEMBERSHIP_FEE",
                amount: 750,
                dueDate: null,
                title: "Medlemskontingent 2026-06",
                transactionId: "tx_old",
                memberId: "m1",
                member: makeMember({ id: "m1" })
            }) as never
        );

        const res = await setInvoiceStatus("req_paid", "PENDING" as never);

        expect(res.success).toBe(true);
        expect(prismaMock.transaction.delete).toHaveBeenCalledWith({ where: { id: "tx_old" } });
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { balance: { decrement: expect.anything() } } })
        );
        expect(prismaMock.payment.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: "UNPAID" }) })
        );
        const updateArg = prismaMock.paymentRequest.update.mock.calls[0][0] as { data: Record<string, unknown> };
        expect(updateArg.data.status).toBe("PENDING");
        expect(updateArg.data.transactionId).toBeNull();
        expect(updateArg.data.dueDate).toBeInstanceOf(Date);
    });

    it("PENDING -> WAIVED: pure status flip with no ledger impact", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({
                id: "req_pending",
                status: "PENDING",
                category: "MEMBERSHIP_FEE",
                member: makeMember()
            }) as never
        );

        const res = await setInvoiceStatus("req_pending", "WAIVED" as never);

        expect(res.success).toBe(true);
        expect(prismaMock.transaction.create).not.toHaveBeenCalled();
        expect(prismaMock.transaction.delete).not.toHaveBeenCalled();
        expect(prismaMock.member.update).not.toHaveBeenCalled();
        expect(prismaMock.paymentRequest.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: "WAIVED" }) })
        );
    });

    it("PAID -> PAUSED: voids payment and clears the due date", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({
                id: "req_paid2",
                status: "PAID",
                category: "MEMBERSHIP_FEE",
                transactionId: "tx_old2",
                title: "Medlemskontingent 2026-06",
                dueDate: new Date("2026-06-30T00:00:00.000Z"),
                member: makeMember()
            }) as never
        );

        const res = await setInvoiceStatus("req_paid2", "PAUSED" as never);

        expect(res.success).toBe(true);
        expect(prismaMock.transaction.delete).toHaveBeenCalled();
        const updateArg = prismaMock.paymentRequest.update.mock.calls[0][0] as { data: Record<string, unknown> };
        expect(updateArg.data.status).toBe("PAUSED");
        expect(updateArg.data.dueDate).toBeNull();
    });

    it("rejects when the member is soft-deleted", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({ status: "PENDING", member: makeMember({ deletedAt: new Date() }) }) as never
        );
        const res = await setInvoiceStatus("req", "PAID" as never);
        expect(res.success).toBe(false);
    });
});
