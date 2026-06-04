import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { makePaymentRequest, makeMember, makeTransaction } from "../../helpers/fixtures";
import { loginAsMember } from "../../helpers/auth";

// Notifications are exercised in their own suite; stub them here.
vi.mock("@/server/actions/notifications", () => ({
    createNotification: vi.fn(async () => undefined),
    createNotificationsForMembers: vi.fn(async () => undefined),
    createManyNotifications: vi.fn(async () => undefined)
}));

import {
    createPaymentRequest,
    markRequestAsPaid,
    deletePaymentRequest,
    getPaymentRequest
} from "@/server/actions/payment-requests";
import { createNotification } from "@/server/actions/notifications";

describe("createPaymentRequest", () => {
    it("creates a PENDING request with a rounded amount and notifies the member", async () => {
        prismaMock.paymentRequest.create.mockResolvedValue(makePaymentRequest({ id: "req_1" }) as never);

        const res = await createPaymentRequest({
            title: "Cup fee",
            amount: 199.999,
            memberId: "member_1",
            category: "OTHER" as never
        });

        expect(res.success).toBe(true);
        expect(prismaMock.paymentRequest.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ amount: 200, status: "PENDING", title: "Cup fee" })
            })
        );
        expect(createNotification).toHaveBeenCalledWith(
            expect.objectContaining({ memberId: "member_1", type: "INVOICE_CREATED" })
        );
    });

    it("rejects a negative amount", async () => {
        const res = await createPaymentRequest({
            title: "Bad",
            amount: -10,
            memberId: "member_1",
            category: "OTHER" as never
        });
        expect(res.success).toBe(false);
        expect(prismaMock.paymentRequest.create).not.toHaveBeenCalled();
    });
});

describe("markRequestAsPaid", () => {
    beforeEach(() => {
        prismaMock.transaction.create.mockResolvedValue(makeTransaction({ id: "tx_1" }) as never);
        prismaMock.paymentRequest.update.mockResolvedValue(makePaymentRequest() as never);
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
        prismaMock.payment.upsert.mockResolvedValue({} as never);
    });

    it("creates a transaction, increments balance and upserts the Payment for a membership fee", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({
                id: "req_2",
                status: "PENDING",
                category: "MEMBERSHIP_FEE",
                amount: 750,
                dueDate: new Date("2026-06-30T00:00:00.000Z"),
                memberId: "member_9",
                member: makeMember({ id: "member_9" })
            }) as never
        );

        const res = await markRequestAsPaid("req_2");

        expect(res.success).toBe(true);
        expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { balance: { increment: 750 } } })
        );
        expect(prismaMock.paymentRequest.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ status: "PAID", transactionId: "tx_1" }) })
        );
        expect(prismaMock.payment.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { memberId_period: { memberId: "member_9", period: "2026-06" } }
            })
        );
    });

    it("is idempotent — refuses to re-pay an already PAID request", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({ status: "PAID", member: makeMember() }) as never
        );
        const res = await markRequestAsPaid("req_paid");
        expect(res).toEqual({ success: false, error: "Already paid" });
        expect(prismaMock.transaction.create).not.toHaveBeenCalled();
    });

    it("returns an error when the request does not exist", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(null as never);
        const res = await markRequestAsPaid("missing");
        expect(res.success).toBe(false);
    });
});

describe("deletePaymentRequest", () => {
    it("blocks deleting a PAID request", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({ status: "PAID" }) as never
        );
        const res = await deletePaymentRequest("req_paid");
        expect(res.success).toBe(false);
        expect(prismaMock.paymentRequest.delete).not.toHaveBeenCalled();
    });

    it("deletes a PENDING request", async () => {
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({ status: "PENDING", id: "req_del" }) as never
        );
        prismaMock.paymentRequest.delete.mockResolvedValue(makePaymentRequest() as never);
        const res = await deletePaymentRequest("req_del");
        expect(res.success).toBe(true);
        expect(prismaMock.paymentRequest.delete).toHaveBeenCalledWith({ where: { id: "req_del" } });
    });
});

describe("getPaymentRequest", () => {
    it("denies access to a non-owner non-admin member", async () => {
        loginAsMember({ id: "intruder", role: "MEMBER" });
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({ memberId: "owner", member: makeMember({ id: "owner" }) }) as never
        );
        const res = await getPaymentRequest("req_x");
        expect(res.success).toBe(false);
    });

    it("allows the owner to read their own request", async () => {
        loginAsMember({ id: "owner", role: "MEMBER" });
        prismaMock.paymentRequest.findUnique.mockResolvedValue(
            makePaymentRequest({ memberId: "owner", amount: 500, member: makeMember({ id: "owner" }) }) as never
        );
        const res = await getPaymentRequest("req_x");
        expect(res.success).toBe(true);
        expect(res.data?.amount).toBe(500);
    });
});
