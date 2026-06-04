import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { makeMember, makeTransaction, makePaymentRequest } from "../../helpers/fixtures";
import { loginAsAdmin, loginAsMember, logout } from "../../helpers/auth";

// finance.ts imports createNotification + createManyNotifications from this module.
// Mock with ASYNC fns since callers may .catch(...) on them.
vi.mock("@/server/actions/notifications", () => ({
    createNotification: vi.fn(async () => undefined),
    createManyNotifications: vi.fn(async () => undefined),
    createNotificationsForMembers: vi.fn(async () => undefined),
    broadcastNotification: vi.fn(async () => undefined),
    notifyNewPhotos: vi.fn(async () => undefined),
    sendInvoiceDeadlineReminders: vi.fn(async () => undefined)
}));

import {
    registerExpense,
    getAdminExpenses,
    updateExpense,
    deleteExpense,
    getAllTransactions,
    getTransactionDetails,
    recalculateAllBalances,
    setMemberBalance,
    deleteTransaction,
    deleteAllTransactions,
    getAllTransactionsRaw
} from "@/server/actions/finance";
import { createNotification, createManyNotifications } from "@/server/actions/notifications";
import { revalidatePath } from "next/cache";

const SPLIT_SUFFIX = " (Splittet)";

/** Helper: an expense input with sensible defaults. */
const expenseInput = (overrides: Partial<Parameters<typeof registerExpense>[0]> = {}) => ({
    amount: 100,
    description: "Innkjøp",
    category: "EXPENSE",
    date: new Date("2026-05-01T10:00:00.000Z"),
    splitMemberIds: [] as string[],
    ...overrides
});

describe("registerExpense", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.transaction.create.mockResolvedValue(makeTransaction() as never);
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
    });

    it("rejects non-admin members", async () => {
        loginAsMember();
        const res = await registerExpense(expenseInput());
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.transaction.create).not.toHaveBeenCalled();
    });

    it("returns an error for unauthenticated callers", async () => {
        logout();
        const res = await registerExpense(expenseInput());
        // ensureMember rejects -> caught -> generic error
        expect(res.success).toBe(false);
        expect(prismaMock.transaction.create).not.toHaveBeenCalled();
    });

    it("rejects an empty description", async () => {
        const res = await registerExpense(expenseInput({ description: "   " }));
        expect(res).toEqual({ success: false, error: "Beskrivelse må fylles ut" });
        expect(prismaMock.transaction.create).not.toHaveBeenCalled();
    });

    it("rejects a zero amount", async () => {
        const res = await registerExpense(expenseInput({ amount: 0 }));
        expect(res).toEqual({ success: false, error: "Beløp må være større enn 0" });
        expect(prismaMock.transaction.create).not.toHaveBeenCalled();
    });

    it("rejects a non-finite amount", async () => {
        const res = await registerExpense(expenseInput({ amount: Number.NaN }));
        expect(res).toEqual({ success: false, error: "Beløp må være større enn 0" });
        expect(prismaMock.transaction.create).not.toHaveBeenCalled();
    });

    it("creates a single NEGATIVE club transaction (no members, no balance change, no notifications)", async () => {
        const res = await registerExpense(expenseInput({ amount: 250.5, description: "  Mat  " }));

        expect(res).toEqual({ success: true });
        expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
        expect(prismaMock.transaction.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    amount: -250.5,
                    description: "Mat",
                    category: "EXPENSE",
                    eventId: null,
                    receiptUrl: null,
                    receiptKey: null
                })
            })
        );
        // No memberId on a club-level expense, no balance decrement, no notifications.
        expect(prismaMock.member.update).not.toHaveBeenCalled();
        expect(createManyNotifications).not.toHaveBeenCalled();
        expect(revalidatePath).toHaveBeenCalledWith("/admin/finance");
        expect(revalidatePath).toHaveBeenCalledWith("/admin/finance/expenses");
    });

    it("uses the absolute, two-decimal-rounded amount for negative/odd inputs", async () => {
        await registerExpense(expenseInput({ amount: -199.999 }));
        expect(prismaMock.transaction.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ amount: -200 }) })
        );
    });

    it("forwards eventId / receipt fields when present", async () => {
        await registerExpense(
            expenseInput({ amount: 50, eventId: "event_9", receiptUrl: "https://r/x.pdf", receiptKey: "key_x" })
        );
        expect(prismaMock.transaction.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ eventId: "event_9", receiptUrl: "https://r/x.pdf", receiptKey: "key_x" })
            })
        );
    });

    it("splits an expense across members: NEGATIVE per-share transactions + balance decrements + notifications", async () => {
        const res = await registerExpense(
            expenseInput({ amount: 100, description: "Felleskostnad", splitMemberIds: ["m1", "m2", "m3"] })
        );

        expect(res).toEqual({ success: true });

        // splitAmountIntoShares(100, 3) -> [33.34, 33.33, 33.33] (remainder cent to first member)
        const txCalls = prismaMock.transaction.create.mock.calls.map((c) => c[0].data);
        expect(txCalls).toHaveLength(3);
        expect(txCalls[0].amount).toBeCloseTo(-33.34, 5);
        expect(txCalls[1].amount).toBeCloseTo(-33.33, 5);
        expect(txCalls[2].amount).toBeCloseTo(-33.33, 5);
        // Sum of split transactions equals the negative total.
        const txSum = txCalls.reduce((s, d) => s + (d.amount as number), 0);
        expect(txSum).toBeCloseTo(-100, 5);

        // Each split transaction is tagged with the suffix + member id.
        expect(txCalls[0].description).toBe(`Felleskostnad${SPLIT_SUFFIX}`);
        expect(txCalls.map((d) => d.memberId)).toEqual(["m1", "m2", "m3"]);

        // Balance is DECREMENTED by each member's share.
        const decrements = prismaMock.member.update.mock.calls.map((c) => c[0]);
        expect(decrements).toHaveLength(3);
        expect(decrements[0]).toEqual(
            expect.objectContaining({ where: { id: "m1" }, data: { balance: { decrement: 33.34 } } })
        );
        expect(decrements[1]).toEqual(
            expect.objectContaining({ where: { id: "m2" }, data: { balance: { decrement: 33.33 } } })
        );

        // Notifications: one BALANCE_WITHDRAWAL per member.
        expect(createManyNotifications).toHaveBeenCalledTimes(1);
        const notifs = (createManyNotifications as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(notifs).toHaveLength(3);
        expect(notifs[0]).toEqual(
            expect.objectContaining({ memberId: "m1", type: "BALANCE_WITHDRAWAL", title: "Ny belastning" })
        );
        expect(notifs[0].message).toContain("33.34");
    });

    it("de-duplicates split member ids and filters out falsy ids", async () => {
        await registerExpense(
            expenseInput({ amount: 90, splitMemberIds: ["m1", "m1", "", "m2"] as string[] })
        );
        // Only 2 unique members -> 45/45.
        const txCalls = prismaMock.transaction.create.mock.calls.map((c) => c[0].data);
        expect(txCalls).toHaveLength(2);
        expect(txCalls.map((d) => d.memberId)).toEqual(["m1", "m2"]);
        expect(txCalls[0].amount).toBeCloseTo(-45, 5);
        expect(txCalls[1].amount).toBeCloseTo(-45, 5);
    });

    it("returns a generic error when the DB write throws", async () => {
        prismaMock.transaction.create.mockRejectedValueOnce(new Error("db down"));
        const res = await registerExpense(expenseInput({ amount: 10 }));
        expect(res).toEqual({ success: false, error: "Kunne ikke registrere utgift" });
    });
});

describe("getAdminExpenses", () => {
    beforeEach(() => {
        loginAsAdmin();
    });

    it("rejects non-admins", async () => {
        loginAsMember();
        const res = await getAdminExpenses();
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("returns an empty result when there are no expense transactions", async () => {
        prismaMock.transaction.findMany.mockResolvedValue([] as never);
        const res = await getAdminExpenses();
        expect(res).toEqual({ success: true, expenses: [], nextCursor: null, hasMore: false });
    });

    it("groups split transactions into a single expense with combined total and members", async () => {
        const date = new Date("2026-05-01T10:00:00.000Z");
        const split = (over: Record<string, unknown>) =>
            makeTransaction({
                amount: undefined,
                description: `Tur${SPLIT_SUFFIX}`,
                category: "EXPENSE",
                date,
                eventId: null,
                receiptKey: null,
                event: null,
                ...over
            });

        const seedBatch = [
            split({
                id: "tx_a",
                amount: { lt: 0 } as never, // unused; overwritten below
                memberId: "m1",
                member: { id: "m1", firstName: "A", lastName: "One", avatarUrl: null }
            }),
            split({
                id: "tx_b",
                memberId: "m2",
                member: { id: "m2", firstName: "B", lastName: "Two", avatarUrl: null }
            })
        ];
        // Fix amount fields explicitly (Decimal-ish numbers).
        (seedBatch[0] as Record<string, unknown>).amount = -30;
        (seedBatch[1] as Record<string, unknown>).amount = -30;

        // First call: seed batch loop. Second call: full group lookup.
        prismaMock.transaction.findMany
            .mockResolvedValueOnce(seedBatch as never)
            .mockResolvedValueOnce(seedBatch as never);

        const res = await getAdminExpenses({ limit: 10 });

        expect(res.success).toBe(true);
        expect(res.expenses).toHaveLength(1);
        const group = res.expenses![0];
        expect(group.totalAmount).toBeCloseTo(60, 5);
        expect(group.splitCount).toBe(2);
        expect(group.memberIds).toEqual(["m1", "m2"]);
        expect(group.description).toBe("Tur"); // suffix normalized away
        expect(res.hasMore).toBe(false);
    });

    it("clamps limit into the 1..50 range (passes a valid take to Prisma)", async () => {
        prismaMock.transaction.findMany.mockResolvedValue([] as never);
        await getAdminExpenses({ limit: 9999 });
        // batchSize = max(limit*6, 60); take = batchSize + 1. limit is clamped to 50 -> 300, take 301.
        expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 301 })
        );
    });

    it("returns a generic error when the query throws", async () => {
        prismaMock.transaction.findMany.mockRejectedValueOnce(new Error("boom"));
        const res = await getAdminExpenses();
        expect(res).toEqual({ success: false, error: "Kunne ikke hente utgifter" });
    });
});

describe("updateExpense", () => {
    const baseUpdate = (over: Partial<Parameters<typeof updateExpense>[0]> = {}) => ({
        expenseId: "tx_old",
        amount: 200,
        description: "Oppdatert",
        category: "EXPENSE",
        date: new Date("2026-05-02T10:00:00.000Z"),
        splitMemberIds: [] as string[],
        ...over
    });

    beforeEach(() => {
        loginAsAdmin();
        prismaMock.transaction.create.mockResolvedValue(makeTransaction() as never);
        prismaMock.transaction.deleteMany.mockResolvedValue({ count: 1 } as never);
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
    });

    it("rejects non-admins", async () => {
        loginAsMember();
        const res = await updateExpense(baseUpdate());
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("rejects an empty description", async () => {
        const res = await updateExpense(baseUpdate({ description: "  " }));
        expect(res).toEqual({ success: false, error: "Beskrivelse må fylles ut" });
    });

    it("rejects a non-positive amount", async () => {
        const res = await updateExpense(baseUpdate({ amount: 0 }));
        expect(res).toEqual({ success: false, error: "Beløp må være større enn 0" });
    });

    it("returns not-found when the target transaction is missing (no explicit ids)", async () => {
        prismaMock.transaction.findUnique.mockResolvedValue(null as never);
        const res = await updateExpense(baseUpdate());
        expect(res).toEqual({ success: false, error: "Fant ikke utgift" });
    });

    it("errors when explicit transactionIds do not all resolve", async () => {
        // explicit ids: expenseId tx_old + tx_x -> 2 expected, only 1 returned.
        prismaMock.transaction.findMany.mockResolvedValueOnce([
            { id: "tx_old", amount: -50, memberId: "m1" }
        ] as never);
        const res = await updateExpense(baseUpdate({ transactionIds: ["tx_x"] }));
        expect(res).toEqual({ success: false, error: "Fant ikke alle transaksjoner i denne utgiften" });
    });

    it("reverts old member balances then applies new split shares", async () => {
        // Resolve the old group via the description-based lookup path.
        prismaMock.transaction.findUnique.mockResolvedValue(
            makeTransaction({
                id: "tx_old",
                date: new Date("2026-05-02T10:00:00.000Z"),
                category: "EXPENSE",
                description: `Oppdatert${SPLIT_SUFFIX}`,
                eventId: null,
                receiptKey: null
            }) as never
        );
        // Old related: two members each -25 (total -50).
        prismaMock.transaction.findMany.mockResolvedValueOnce([
            { id: "tx_old", amount: -25, memberId: "m1" },
            { id: "tx_old2", amount: -25, memberId: "m2" }
        ] as never);

        const res = await updateExpense(
            baseUpdate({ amount: 100, splitMemberIds: ["m1", "m2"] })
        );

        expect(res).toEqual({ success: true });

        // Revert: decrement by the OLD (negative) amount -> effectively credits back.
        const updateCalls = prismaMock.member.update.mock.calls.map((c) => c[0]);
        // First two calls are reverts (decrement: -25), next two are new shares (decrement: 50).
        expect(updateCalls[0]).toEqual(
            expect.objectContaining({ where: { id: "m1" }, data: { balance: { decrement: -25 } } })
        );
        expect(updateCalls[1]).toEqual(
            expect.objectContaining({ where: { id: "m2" }, data: { balance: { decrement: -25 } } })
        );

        // Old transactions deleted.
        expect(prismaMock.transaction.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ["tx_old", "tx_old2"] } }
        });

        // New split: 100 / 2 -> 50/50 negative transactions + decrements.
        const newTxs = prismaMock.transaction.create.mock.calls.map((c) => c[0].data);
        expect(newTxs).toHaveLength(2);
        expect(newTxs[0].amount).toBeCloseTo(-50, 5);
        expect(newTxs[1].amount).toBeCloseTo(-50, 5);
        expect(updateCalls[2]).toEqual(
            expect.objectContaining({ where: { id: "m1" }, data: { balance: { decrement: 50 } } })
        );
        expect(updateCalls[3]).toEqual(
            expect.objectContaining({ where: { id: "m2" }, data: { balance: { decrement: 50 } } })
        );
        expect(revalidatePath).toHaveBeenCalledWith("/admin/finance/transactions");
    });

    it("when the new split is empty, reverts old shares and creates a single club transaction", async () => {
        prismaMock.transaction.findMany.mockResolvedValueOnce([
            { id: "tx_old", amount: -40, memberId: "m1" }
        ] as never);

        const res = await updateExpense(
            baseUpdate({ amount: 40, splitMemberIds: [], transactionIds: ["tx_old"] })
        );

        expect(res).toEqual({ success: true });
        // Single club transaction, no member id.
        expect(prismaMock.transaction.create).toHaveBeenCalledTimes(1);
        const created = prismaMock.transaction.create.mock.calls[0][0].data;
        expect(created.amount).toBeCloseTo(-40, 5);
        expect(created.memberId).toBeUndefined();
    });

    it("does not revert balances for old club-level transactions with no member", async () => {
        prismaMock.transaction.findMany.mockResolvedValueOnce([
            { id: "tx_old", amount: -40, memberId: null }
        ] as never);

        await updateExpense(baseUpdate({ amount: 40, splitMemberIds: [], transactionIds: ["tx_old"] }));
        // No revert update (member was null) and no new-share update (empty split).
        expect(prismaMock.member.update).not.toHaveBeenCalled();
    });
});

describe("deleteExpense", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.transaction.deleteMany.mockResolvedValue({ count: 1 } as never);
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
    });

    it("rejects non-admins", async () => {
        loginAsMember();
        const res = await deleteExpense({ expenseId: "tx" });
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("returns not-found when the target transaction does not exist", async () => {
        prismaMock.transaction.findUnique.mockResolvedValue(null as never);
        const res = await deleteExpense({ expenseId: "missing" });
        expect(res).toEqual({ success: false, error: "Fant ikke utgift" });
    });

    it("reverts member balances and deletes the related transactions", async () => {
        prismaMock.transaction.findMany.mockResolvedValueOnce([
            { id: "tx1", amount: -25, memberId: "m1" },
            { id: "tx2", amount: -25, memberId: "m2" }
        ] as never);

        const res = await deleteExpense({ expenseId: "tx1", transactionIds: ["tx2"] });

        expect(res).toEqual({ success: true, count: 2 });
        // Revert each member's share (decrement of the negative amount credits them back).
        const updates = prismaMock.member.update.mock.calls.map((c) => c[0]);
        expect(updates).toEqual([
            expect.objectContaining({ where: { id: "m1" }, data: { balance: { decrement: -25 } } }),
            expect.objectContaining({ where: { id: "m2" }, data: { balance: { decrement: -25 } } })
        ]);
        expect(prismaMock.transaction.deleteMany).toHaveBeenCalledWith({
            where: { id: { in: ["tx1", "tx2"] } }
        });
        expect(revalidatePath).toHaveBeenCalledWith("/admin/finance");
    });

    it("skips balance reverts for transactions with no member", async () => {
        prismaMock.transaction.findUnique.mockResolvedValue(
            makeTransaction({ id: "tx_club", description: "Klubbutgift", date: new Date("2026-05-01T00:00:00.000Z") }) as never
        );
        prismaMock.transaction.findMany.mockResolvedValueOnce([
            { id: "tx_club", amount: -100, memberId: null }
        ] as never);

        const res = await deleteExpense({ expenseId: "tx_club" });
        expect(res).toEqual({ success: true, count: 1 });
        expect(prismaMock.member.update).not.toHaveBeenCalled();
        expect(prismaMock.transaction.deleteMany).toHaveBeenCalled();
    });
});

describe("getAllTransactions", () => {
    beforeEach(() => loginAsAdmin());

    it("rejects non-admins", async () => {
        loginAsMember();
        const res = await getAllTransactions();
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("returns an empty grouped list when there are no transactions", async () => {
        prismaMock.transaction.findMany.mockResolvedValue([] as never);
        const res = await getAllTransactions();
        expect(res).toEqual({ success: true, transactions: [] });
    });

    it("groups split transactions of the same expense and sums their amounts", async () => {
        const date = new Date("2026-05-01T10:00:00.000Z");
        prismaMock.transaction.findMany.mockResolvedValue([
            makeTransaction({
                id: "tx1",
                amount: -30,
                description: `Tur${SPLIT_SUFFIX}`,
                category: "EXPENSE",
                date,
                member: { firstName: "A", lastName: "One" },
                paymentRequest: null
            }),
            makeTransaction({
                id: "tx2",
                amount: -30,
                description: `Tur${SPLIT_SUFFIX}`,
                category: "EXPENSE",
                date,
                member: { firstName: "B", lastName: "Two" },
                paymentRequest: null
            })
        ] as never);

        const res = await getAllTransactions();
        expect(res.success).toBe(true);
        expect(res.transactions).toHaveLength(1);
        const grp = res.transactions![0];
        expect(grp.amount).toBeCloseTo(-60, 5);
        expect(grp.type).toBe("UTGIFT");
        expect(grp.members).toEqual(["A One", "B Two"]);
        expect(grp.description).toBe("Tur");
    });

    it("classifies positive amounts as INNTEKT and groups membership fees by title", async () => {
        prismaMock.transaction.findMany.mockResolvedValue([
            makeTransaction({
                id: "tx_fee1",
                amount: 750,
                description: "Medlemskontingent 2026-06",
                category: "MEMBERSHIP_FEE",
                member: { firstName: "A", lastName: "One" },
                paymentRequest: {
                    title: "Medlemskontingent 2026-06",
                    createdAt: new Date("2026-06-01T00:00:00.000Z"),
                    category: "MEMBERSHIP_FEE"
                }
            }),
            makeTransaction({
                id: "tx_fee2",
                amount: 750,
                description: "Medlemskontingent 2026-06",
                category: "MEMBERSHIP_FEE",
                member: { firstName: "B", lastName: "Two" },
                paymentRequest: {
                    title: "Medlemskontingent 2026-06",
                    createdAt: new Date("2026-06-02T00:00:00.000Z"), // different createdAt, same title
                    category: "MEMBERSHIP_FEE"
                }
            })
        ] as never);

        const res = await getAllTransactions();
        expect(res.transactions).toHaveLength(1); // grouped by title only for fees
        expect(res.transactions![0].type).toBe("INNTEKT");
        expect(res.transactions![0].amount).toBeCloseTo(1500, 5);
    });

    it("returns a generic error when the query throws", async () => {
        prismaMock.transaction.findMany.mockRejectedValueOnce(new Error("boom"));
        const res = await getAllTransactions();
        expect(res).toEqual({ success: false, error: "Kunne ikke hente transaksjoner" });
    });
});

describe("getTransactionDetails", () => {
    beforeEach(() => loginAsAdmin());

    const detailTx = (over: Record<string, unknown> = {}) =>
        makeTransaction({
            id: "tx_target",
            amount: -50,
            description: `Tur${SPLIT_SUFFIX}`,
            category: "EXPENSE",
            date: new Date("2026-05-01T10:00:00.000Z"),
            memberId: "m1",
            member: { id: "m1", firstName: "A", lastName: "One", email: "a@x.no", avatarUrl: null },
            event: null,
            paymentRequest: null,
            ...over
        });

    it("returns not-found when the transaction is missing", async () => {
        prismaMock.transaction.findUnique.mockResolvedValue(null as never);
        const res = await getTransactionDetails("missing", "ADMIN");
        expect(res).toEqual({ success: false, error: "Transaksjon ikke funnet" });
    });

    it("denies ADMIN scope to non-admins", async () => {
        loginAsMember({ id: "m2" });
        prismaMock.transaction.findUnique.mockResolvedValue(detailTx() as never);
        const res = await getTransactionDetails("tx_target", "ADMIN");
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("denies OWN scope to a non-owner", async () => {
        loginAsMember({ id: "intruder" });
        prismaMock.transaction.findUnique.mockResolvedValue(detailTx({ memberId: "m1" }) as never);
        const res = await getTransactionDetails("tx_target", "OWN");
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("aggregates related transactions for an admin and reports the split + type", async () => {
        prismaMock.transaction.findUnique.mockResolvedValue(detailTx() as never);
        prismaMock.transaction.findMany.mockResolvedValue([
            detailTx({ id: "tx_target", amount: -50, memberId: "m1" }),
            detailTx({
                id: "tx_other",
                amount: -50,
                memberId: "m2",
                member: { id: "m2", firstName: "B", lastName: "Two", email: "b@x.no", avatarUrl: null }
            })
        ] as never);

        const res = await getTransactionDetails("tx_target", "ADMIN");
        expect(res.success).toBe(true);
        expect(res.data?.totalAmount).toBeCloseTo(-100, 5);
        expect(res.data?.type).toBe("UTGIFT");
        expect(res.data?.isSplit).toBe(true);
        expect(res.data?.allocations).toHaveLength(2);
        expect(res.data?.description).toBe("Tur");
    });

    it("allows the owner to read their own transaction in OWN scope", async () => {
        loginAsMember({ id: "m1", role: "MEMBER" });
        prismaMock.transaction.findUnique.mockResolvedValue(detailTx({ memberId: "m1" }) as never);
        prismaMock.transaction.findMany.mockResolvedValue([detailTx({ memberId: "m1" })] as never);

        const res = await getTransactionDetails("tx_target", "OWN");
        expect(res.success).toBe(true);
        expect(res.data?.isSplit).toBe(false);
        expect(res.data?.allocations).toHaveLength(1);
    });
});

describe("recalculateAllBalances", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
    });

    it("rejects non-admins", async () => {
        loginAsMember();
        const res = await recalculateAllBalances();
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("sets each member's balance to the SUM of their transactions, defaulting missing members to 0", async () => {
        prismaMock.member.findMany.mockResolvedValue([{ id: "m1" }, { id: "m2" }, { id: "m3" }] as never);
        prismaMock.transaction.groupBy.mockResolvedValue([
            { memberId: "m1", _sum: { amount: 500 } },
            { memberId: "m2", _sum: { amount: -120 } }
            // m3 has no transactions -> should reset to 0
        ] as never);

        const res = await recalculateAllBalances();

        expect(res).toEqual({ success: true, count: 3 });
        const updates = prismaMock.member.update.mock.calls.map((c) => c[0]);
        expect(updates).toEqual([
            expect.objectContaining({ where: { id: "m1" }, data: { balance: 500 } }),
            expect.objectContaining({ where: { id: "m2" }, data: { balance: -120 } }),
            expect.objectContaining({ where: { id: "m3" }, data: { balance: 0 } })
        ]);
        expect(revalidatePath).toHaveBeenCalledWith("/admin/finance");
        expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("handles the empty-club case (no members)", async () => {
        prismaMock.member.findMany.mockResolvedValue([] as never);
        prismaMock.transaction.groupBy.mockResolvedValue([] as never);
        const res = await recalculateAllBalances();
        expect(res).toEqual({ success: true, count: 0 });
        expect(prismaMock.member.update).not.toHaveBeenCalled();
    });

    it("returns a generic error when aggregation throws", async () => {
        prismaMock.member.findMany.mockResolvedValue([{ id: "m1" }] as never);
        prismaMock.transaction.groupBy.mockRejectedValueOnce(new Error("boom"));
        const res = await recalculateAllBalances();
        expect(res).toEqual({ success: false, error: "Kunne ikke synkronisere saldoer" });
    });
});

describe("setMemberBalance", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.transaction.create.mockResolvedValue(makeTransaction() as never);
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
    });

    it("rejects non-admins", async () => {
        loginAsMember();
        const res = await setMemberBalance("m1", 100, "fix");
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("returns not-found when the member does not exist", async () => {
        prismaMock.member.findUnique.mockResolvedValue(null as never);
        const res = await setMemberBalance("ghost", 100, "fix");
        expect(res).toEqual({ success: false, error: "Fant ikke medlem" });
    });

    it("is a no-op when the new balance equals the current balance", async () => {
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ id: "m1", balance: { toNumber: () => 300 } }) as never);
        const res = await setMemberBalance("m1", 300, "no change");
        expect(res).toEqual({ success: true, message: "Ingen endring i saldo." });
        expect(prismaMock.transaction.create).not.toHaveBeenCalled();
        expect(prismaMock.member.update).not.toHaveBeenCalled();
        expect(createNotification).not.toHaveBeenCalled();
    });

    it("raises balance: creates a POSITIVE MANUAL_ADJUSTMENT tx for the difference and a deposit notification", async () => {
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ id: "m1", balance: { toNumber: () => 100 } }) as never);

        const res = await setMemberBalance("m1", 250, "korrigering");

        expect(res).toEqual({ success: true });
        expect(prismaMock.transaction.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    amount: 150, // 250 - 100
                    description: "Manuell justering: korrigering",
                    category: "MANUAL_ADJUSTMENT",
                    memberId: "m1"
                })
            })
        );
        // Balance is set directly (not increment/decrement).
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "m1" }, data: { balance: 250 } })
        );
        expect(createNotification).toHaveBeenCalledWith(
            expect.objectContaining({ memberId: "m1", type: "BALANCE_DEPOSIT", title: "Saldojustering (+)" })
        );
    });

    it("lowers balance: creates a NEGATIVE correction tx and a withdrawal notification", async () => {
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ id: "m1", balance: { toNumber: () => 500 } }) as never);

        const res = await setMemberBalance("m1", 200, "redusert");

        expect(res).toEqual({ success: true });
        expect(prismaMock.transaction.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ amount: -300 }) }) // 200 - 500
        );
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { balance: 200 } })
        );
        expect(createNotification).toHaveBeenCalledWith(
            expect.objectContaining({ type: "BALANCE_WITHDRAWAL", title: "Saldojustering (-)" })
        );
    });
});

describe("deleteTransaction", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.transaction.delete.mockResolvedValue(makeTransaction() as never);
        prismaMock.paymentRequest.update.mockResolvedValue(makePaymentRequest() as never);
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
        prismaMock.payment.updateMany.mockResolvedValue({ count: 1 } as never);
    });

    it("rejects non-admins", async () => {
        loginAsMember();
        const res = await deleteTransaction("tx");
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("returns not-found when the transaction is missing", async () => {
        prismaMock.transaction.findUnique.mockResolvedValue(null as never);
        const res = await deleteTransaction("missing");
        expect(res).toEqual({ success: false, error: "Transaksjon ikke funnet" });
    });

    it("deletes a plain member transaction and reverts the balance by its amount", async () => {
        prismaMock.transaction.findUnique.mockResolvedValue(
            makeTransaction({ id: "tx1", amount: 750, memberId: "m1", member: makeMember({ id: "m1" }), paymentRequest: null }) as never
        );

        const res = await deleteTransaction("tx1");

        expect(res).toEqual({ success: true });
        expect(prismaMock.transaction.delete).toHaveBeenCalledWith({ where: { id: "tx1" } });
        // decrement by the (positive) amount voids the credit.
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: "m1" }, data: { balance: { decrement: 750 } } })
        );
        // No linked request -> no request/payment changes.
        expect(prismaMock.paymentRequest.update).not.toHaveBeenCalled();
        expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
    });

    it("reverts a linked membership-fee payment: request -> PENDING, payment -> UNPAID", async () => {
        prismaMock.transaction.findUnique.mockResolvedValue(
            makeTransaction({
                id: "tx_fee",
                amount: 750,
                memberId: "m1",
                member: makeMember({ id: "m1" }),
                paymentRequest: makePaymentRequest({
                    id: "req1",
                    memberId: "m1",
                    status: "PAID",
                    category: "MEMBERSHIP_FEE",
                    dueDate: new Date("2026-06-30T00:00:00.000Z")
                })
            }) as never
        );

        const res = await deleteTransaction("tx_fee");

        expect(res).toEqual({ success: true });
        expect(prismaMock.paymentRequest.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "req1" },
                data: { status: "PENDING", transactionId: null }
            })
        );
        expect(prismaMock.payment.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { memberId: "m1", period: "2026-06" },
                data: { status: "UNPAID", amount: null, paidAt: null }
            })
        );
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { balance: { decrement: 750 } } })
        );
    });

    it("reverts a NEGATIVE (expense) transaction by decrementing the negative amount (credits the member back)", async () => {
        prismaMock.transaction.findUnique.mockResolvedValue(
            makeTransaction({ id: "tx_exp", amount: -100, memberId: "m1", member: makeMember({ id: "m1" }), paymentRequest: null }) as never
        );

        const res = await deleteTransaction("tx_exp");
        expect(res).toEqual({ success: true });
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { balance: { decrement: -100 } } })
        );
    });

    it("skips balance revert for a club transaction with no member", async () => {
        prismaMock.transaction.findUnique.mockResolvedValue(
            makeTransaction({ id: "tx_club", amount: -100, memberId: null, member: null, paymentRequest: null }) as never
        );
        const res = await deleteTransaction("tx_club");
        expect(res).toEqual({ success: true });
        expect(prismaMock.member.update).not.toHaveBeenCalled();
        expect(prismaMock.transaction.delete).toHaveBeenCalledWith({ where: { id: "tx_club" } });
    });

    it("does not touch the Payment table for a non-membership-fee linked request", async () => {
        prismaMock.transaction.findUnique.mockResolvedValue(
            makeTransaction({
                id: "tx_other",
                amount: 200,
                memberId: "m1",
                member: makeMember({ id: "m1" }),
                paymentRequest: makePaymentRequest({ id: "req2", category: "OTHER", dueDate: new Date("2026-06-30T00:00:00.000Z") })
            }) as never
        );
        await deleteTransaction("tx_other");
        expect(prismaMock.paymentRequest.update).toHaveBeenCalled();
        expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
    });
});

describe("deleteAllTransactions", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.paymentRequest.updateMany.mockResolvedValue({ count: 3 } as never);
        prismaMock.payment.updateMany.mockResolvedValue({ count: 3 } as never);
        prismaMock.transaction.deleteMany.mockResolvedValue({ count: 9 } as never);
        prismaMock.member.updateMany.mockResolvedValue({ count: 5 } as never);
    });

    it("rejects non-admins", async () => {
        loginAsMember();
        const res = await deleteAllTransactions();
        expect(res).toEqual({ success: false, error: "Unauthorized" });
        expect(prismaMock.transaction.deleteMany).not.toHaveBeenCalled();
    });

    it("resets linked requests->PENDING, payments->UNPAID, deletes all txs, and zeroes balances", async () => {
        const res = await deleteAllTransactions();

        expect(res).toEqual({ success: true });
        expect(prismaMock.paymentRequest.updateMany).toHaveBeenCalledWith({
            where: { transactionId: { not: null } },
            data: { status: "PENDING", transactionId: null }
        });
        expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({
            data: { status: "UNPAID", amount: null, paidAt: null }
        });
        expect(prismaMock.transaction.deleteMany).toHaveBeenCalledWith({});
        expect(prismaMock.member.updateMany).toHaveBeenCalledWith({ data: { balance: 0 } });
        expect(revalidatePath).toHaveBeenCalledWith("/admin/finance");
    });

    it("returns a generic error when the transaction wipe throws", async () => {
        prismaMock.transaction.deleteMany.mockRejectedValueOnce(new Error("boom"));
        const res = await deleteAllTransactions();
        expect(res).toEqual({ success: false, error: "Kunne ikke slette alle transaksjoner" });
    });
});

describe("getAllTransactionsRaw", () => {
    beforeEach(() => loginAsAdmin());

    it("rejects non-admins", async () => {
        loginAsMember();
        const res = await getAllTransactionsRaw();
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("maps transactions to a flat shape with INNTEKT/UTGIFT type and member name", async () => {
        prismaMock.transaction.findMany.mockResolvedValue([
            makeTransaction({
                id: "tx_in",
                amount: 750,
                description: "Innbetaling",
                category: "MEMBERSHIP_FEE",
                member: { id: "m1", firstName: "A", lastName: "One" }
            }),
            makeTransaction({
                id: "tx_out",
                amount: -200,
                description: "Utgift",
                category: "EXPENSE",
                member: null
            })
        ] as never);

        const res = await getAllTransactionsRaw();
        expect(res.success).toBe(true);
        expect(res.transactions).toEqual([
            expect.objectContaining({ id: "tx_in", type: "INNTEKT", amount: 750, member: { id: "m1", name: "A One" } }),
            expect.objectContaining({ id: "tx_out", type: "UTGIFT", amount: -200, member: null })
        ]);
    });

    it("returns an empty list when there are no transactions", async () => {
        prismaMock.transaction.findMany.mockResolvedValue([] as never);
        const res = await getAllTransactionsRaw();
        expect(res).toEqual({ success: true, transactions: [] });
    });

    it("returns a generic error when the query throws", async () => {
        prismaMock.transaction.findMany.mockRejectedValueOnce(new Error("boom"));
        const res = await getAllTransactionsRaw();
        expect(res).toEqual({ success: false, error: "Kunne ikke hente transaksjoner" });
    });
});
