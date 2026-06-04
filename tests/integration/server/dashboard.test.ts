import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { makeMember, makeTransaction, makeEvent, dec } from "../../helpers/fixtures";

import { getAdminDashboardData } from "@/server/dashboard/getAdminDashboardData";
import { getAdminFinanceData } from "@/server/dashboard/getAdminFinanceData";
import { syncClerkRoleMetadata } from "@/server/clerk/syncRoleMetadata";
import { PaymentCategory, RequestStatus } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";

// Silence the intentional console.error/console.warn that the source emits on
// settled-failure / retry paths; we assert behaviour, not log output.
beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});

// Helper: an aggregate result shaped like prisma.transaction.aggregate returns.
const aggSum = (amount: number | string | null) => ({ _sum: { amount: amount === null ? null : dec(amount) } });

describe("getAdminDashboardData", () => {
    const member = { firstName: "Ada", role: "ADMIN", userRole: { name: "Editor" } };

    beforeEach(() => {
        // Sensible defaults; individual tests override as needed.
        prismaMock.event.findFirst.mockResolvedValue(null as never);
        prismaMock.member.count.mockResolvedValue(0 as never);
        prismaMock.transaction.aggregate.mockResolvedValue(aggSum(null) as never);
        prismaMock.paymentRequest.count.mockResolvedValue(0 as never);
    });

    it("computes treasury balance as the SUM of transaction amounts", async () => {
        prismaMock.transaction.aggregate.mockResolvedValue(aggSum(13250.5) as never);

        const data = await getAdminDashboardData(member);

        expect(data.treasuryBalance).toBe(13250.5);
        // The treasury query is a plain SUM aggregate over all transactions.
        expect(prismaMock.transaction.aggregate).toHaveBeenCalledWith({ _sum: { amount: true } });
    });

    it("treats a null treasury sum (no transactions) as a zero balance", async () => {
        prismaMock.transaction.aggregate.mockResolvedValue(aggSum(null) as never);

        const data = await getAdminDashboardData(member);

        expect(data.treasuryBalance).toBe(0);
    });

    it("handles a negative treasury balance (net deficit)", async () => {
        prismaMock.transaction.aggregate.mockResolvedValue(aggSum(-500) as never);

        const data = await getAdminDashboardData(member);

        expect(data.treasuryBalance).toBe(-500);
    });

    it("passes through the member count", async () => {
        prismaMock.member.count.mockResolvedValue(42 as never);

        const data = await getAdminDashboardData(member);

        expect(data.memberCount).toBe(42);
        expect(prismaMock.member.count).toHaveBeenCalled();
    });

    it("forwards the member's firstName, role and userRole onto the dashboard payload", async () => {
        const data = await getAdminDashboardData(member);

        expect(data.firstName).toBe("Ada");
        expect(data.role).toBe("ADMIN");
        expect(data.userRole).toEqual({ name: "Editor" });
    });

    it("returns unpaidCount = -1 when there are no membership-fee requests this month", async () => {
        // First paymentRequest.count call = total (0), second = unpaid (irrelevant).
        prismaMock.paymentRequest.count
            .mockResolvedValueOnce(0 as never)
            .mockResolvedValueOnce(0 as never);

        const data = await getAdminDashboardData(member);

        expect(data.unpaidCount).toBe(-1);
    });

    it("returns the unpaid count when membership-fee requests exist this month", async () => {
        prismaMock.paymentRequest.count
            .mockResolvedValueOnce(10 as never) // total this month
            .mockResolvedValueOnce(3 as never); // unpaid (PENDING) this month

        const data = await getAdminDashboardData(member);

        expect(data.unpaidCount).toBe(3);
    });

    it("returns unpaidCount = 0 when every membership request this month is paid", async () => {
        prismaMock.paymentRequest.count
            .mockResolvedValueOnce(8 as never) // total
            .mockResolvedValueOnce(0 as never); // unpaid

        const data = await getAdminDashboardData(member);

        expect(data.unpaidCount).toBe(0);
    });

    it("scopes the membership-request counts to the current calendar month", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));

        prismaMock.paymentRequest.count
            .mockResolvedValueOnce(5 as never)
            .mockResolvedValueOnce(2 as never);

        await getAdminDashboardData(member);

        const startOfMonth = new Date(2026, 5, 1);
        const startOfNextMonth = new Date(2026, 6, 1);

        // Total this-month query.
        expect(prismaMock.paymentRequest.count).toHaveBeenNthCalledWith(1, {
            where: {
                category: "MEMBERSHIP_FEE",
                dueDate: { gte: startOfMonth, lt: startOfNextMonth }
            }
        });
        // Unpaid (PENDING) this-month query.
        expect(prismaMock.paymentRequest.count).toHaveBeenNthCalledWith(2, {
            where: {
                category: "MEMBERSHIP_FEE",
                status: "PENDING",
                dueDate: { gte: startOfMonth, lt: startOfNextMonth }
            }
        });
    });

    it("selects the next upcoming event and ISO-serialises its startAt", async () => {
        const startAt = new Date("2026-07-01T18:00:00.000Z");
        prismaMock.event.findFirst.mockResolvedValue(
            makeEvent({ id: "ev_next", title: "Sommerfest", startAt }) as never
        );

        const data = await getAdminDashboardData(member);

        expect(prismaMock.event.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: { startAt: "asc" } })
        );
        expect(data.nextEvent).not.toBeNull();
        expect(data.nextEvent?.id).toBe("ev_next");
        expect(data.nextEvent?.title).toBe("Sommerfest");
        expect(data.nextEvent?.startAt).toBe(startAt.toISOString());
        // A placeholder cover image is always attached.
        expect(typeof data.nextEvent?.coverImage).toBe("string");
        expect(data.nextEvent?.coverImage).toContain("http");
    });

    it("only queries for events in the future (startAt >= now)", async () => {
        await getAdminDashboardData(member);

        const callArg = prismaMock.event.findFirst.mock.calls[0][0] as {
            where: { startAt: { gte: Date } };
        };
        expect(callArg.where.startAt.gte).toBeInstanceOf(Date);
    });

    it("returns nextEvent = null when there is no upcoming event", async () => {
        prismaMock.event.findFirst.mockResolvedValue(null as never);

        const data = await getAdminDashboardData(member);

        expect(data.nextEvent).toBeNull();
    });

    it("degrades gracefully: a failed treasury aggregate falls back to 0 without throwing", async () => {
        prismaMock.transaction.aggregate.mockRejectedValue(new Error("Unique constraint failed") as never);
        prismaMock.member.count.mockResolvedValue(7 as never);

        const data = await getAdminDashboardData(member);

        // The whole call still resolves; the failed slice falls back.
        expect(data.treasuryBalance).toBe(0);
        expect(data.memberCount).toBe(7);
    });

    it("degrades gracefully: a failed member count falls back to 0", async () => {
        prismaMock.member.count.mockRejectedValue(new Error("boom") as never);
        prismaMock.transaction.aggregate.mockResolvedValue(aggSum(100) as never);

        const data = await getAdminDashboardData(member);

        expect(data.memberCount).toBe(0);
        expect(data.treasuryBalance).toBe(100);
    });

    it("degrades gracefully: a failed next-event lookup yields nextEvent = null", async () => {
        prismaMock.event.findFirst.mockRejectedValue(new Error("boom") as never);

        const data = await getAdminDashboardData(member);

        expect(data.nextEvent).toBeNull();
    });
});

describe("getAdminFinanceData", () => {
    // Configure every one of the eight settled queries with safe defaults.
    function setDefaults() {
        prismaMock.transaction.findMany.mockResolvedValue([] as never);
        // aggregate is called three times (treasury, income, expense) — default null.
        prismaMock.transaction.aggregate.mockResolvedValue(aggSum(null) as never);
        prismaMock.member.findMany.mockResolvedValue([] as never);
        prismaMock.membershipType.findMany.mockResolvedValue([] as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);
    }

    beforeEach(() => {
        setDefaults();
    });

    it("computes treasury / income / expense from the three aggregate calls in order", async () => {
        prismaMock.transaction.aggregate
            .mockResolvedValueOnce(aggSum(5000) as never) // treasury
            .mockResolvedValueOnce(aggSum(8000) as never) // income (amount > 0, this year)
            .mockResolvedValueOnce(aggSum(-3000) as never); // expense (amount < 0, this year)

        const stats = await getAdminFinanceData();

        expect(stats.treasuryBalance).toBe(5000);
        expect(stats.totalIncome).toBe(8000);
        expect(stats.totalExpenses).toBe(-3000);
    });

    it("treats null aggregate sums as zero", async () => {
        prismaMock.transaction.aggregate.mockResolvedValue(aggSum(null) as never);

        const stats = await getAdminFinanceData();

        expect(stats.treasuryBalance).toBe(0);
        expect(stats.totalIncome).toBe(0);
        expect(stats.totalExpenses).toBe(0);
    });

    it("scopes income to positive amounts dated within the current year", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
        setDefaults();

        await getAdminFinanceData();

        const startOfYear = new Date(2026, 0, 1);
        // Income aggregate is the 2nd aggregate call.
        expect(prismaMock.transaction.aggregate).toHaveBeenNthCalledWith(2, {
            _sum: { amount: true },
            where: { amount: { gt: 0 }, date: { gte: startOfYear } }
        });
        // Expense aggregate is the 3rd call.
        expect(prismaMock.transaction.aggregate).toHaveBeenNthCalledWith(3, {
            _sum: { amount: true },
            where: { amount: { lt: 0 }, date: { gte: startOfYear } }
        });
    });

    it("computes expected membership income as fee * 12 per active member, using per-type fees", async () => {
        prismaMock.member.findMany.mockResolvedValueOnce([
            { membershipType: "STANDARD" },
            { membershipType: "STANDARD" },
            { membershipType: "FAMILY" }
        ] as never);
        prismaMock.membershipType.findMany.mockResolvedValue([
            { name: "STANDARD", fee: 750 },
            { name: "FAMILY", fee: 1200 }
        ] as never);

        const stats = await getAdminFinanceData();

        // 2 * 750 * 12 + 1 * 1200 * 12 = 18000 + 14400 = 32400
        expect(stats.expectedMembershipIncome).toBe(32400);
    });

    it("falls back to the STANDARD fee for members with an unknown membership type", async () => {
        prismaMock.member.findMany.mockResolvedValueOnce([
            { membershipType: "MYSTERY" },
            { membershipType: "STANDARD" }
        ] as never);
        prismaMock.membershipType.findMany.mockResolvedValue([
            { name: "STANDARD", fee: 750 }
        ] as never);

        const stats = await getAdminFinanceData();

        // Unknown type falls back to STANDARD (750): 2 * 750 * 12 = 18000
        expect(stats.expectedMembershipIncome).toBe(18000);
    });

    it("uses a zero default fee when no STANDARD membership type exists", async () => {
        prismaMock.member.findMany.mockResolvedValueOnce([
            { membershipType: "UNKNOWN" }
        ] as never);
        prismaMock.membershipType.findMany.mockResolvedValue([] as never);

        const stats = await getAdminFinanceData();

        expect(stats.expectedMembershipIncome).toBe(0);
    });

    it("only counts non-deleted members for expected membership income", async () => {
        prismaMock.member.findMany.mockResolvedValueOnce([{ membershipType: "STANDARD" }] as never);
        prismaMock.membershipType.findMany.mockResolvedValue([{ name: "STANDARD", fee: 750 }] as never);

        await getAdminFinanceData();

        // The members query for income projection filters soft-deleted members out.
        expect(prismaMock.member.findMany).toHaveBeenCalledWith({
            where: { deletedAt: null },
            select: { membershipType: true }
        });
    });

    it("sums invoice-request amounts into expectedInvoiceIncome", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([
            { amount: dec(500) },
            { amount: dec(250.5) },
            { amount: dec(0) }
        ] as never);

        const stats = await getAdminFinanceData();

        expect(stats.expectedInvoiceIncome).toBe(750.5);
    });

    it("combines membership and invoice projections into expectedAnnualIncome", async () => {
        prismaMock.member.findMany.mockResolvedValueOnce([{ membershipType: "STANDARD" }] as never);
        prismaMock.membershipType.findMany.mockResolvedValue([{ name: "STANDARD", fee: 750 }] as never);
        prismaMock.paymentRequest.findMany.mockResolvedValue([{ amount: dec(1000) }] as never);

        const stats = await getAdminFinanceData();

        // membership: 750*12 = 9000 ; invoices: 1000 ; total 10000
        expect(stats.expectedMembershipIncome).toBe(9000);
        expect(stats.expectedInvoiceIncome).toBe(1000);
        expect(stats.expectedAnnualIncome).toBe(10000);
    });

    it("excludes WAIVED and PAUSED requests (and MEMBERSHIP_FEE) from the invoice-projection query", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
        setDefaults();

        await getAdminFinanceData();

        const startOfYear = new Date(2026, 0, 1);
        const startOfNextYear = new Date(2027, 0, 1);

        expect(prismaMock.paymentRequest.findMany).toHaveBeenCalledWith({
            where: {
                category: { not: PaymentCategory.MEMBERSHIP_FEE },
                status: { notIn: [RequestStatus.WAIVED, RequestStatus.PAUSED] },
                OR: [
                    { createdAt: { gte: startOfYear, lt: startOfNextYear } },
                    { dueDate: { gte: startOfYear, lt: startOfNextYear } },
                    { transaction: { is: { date: { gte: startOfYear, lt: startOfNextYear } } } }
                ]
            },
            select: { amount: true }
        });
    });

    it("returns an empty invoice projection when no qualifying requests exist", async () => {
        prismaMock.paymentRequest.findMany.mockResolvedValue([] as never);

        const stats = await getAdminFinanceData();

        expect(stats.expectedInvoiceIncome).toBe(0);
    });

    it("maps and classifies transactions into INNTEKT / UTGIFT by sign", async () => {
        prismaMock.transaction.findMany.mockResolvedValue([
            makeTransaction({
                id: "tx_in",
                amount: dec(750),
                description: "Kontingent",
                category: "MEMBERSHIP_FEE",
                date: new Date("2026-06-01T00:00:00.000Z"),
                member: { id: "m1", firstName: "A", lastName: "B", email: "a@b.no" }
            }),
            makeTransaction({
                id: "tx_out",
                amount: dec(-300),
                description: "Innkjøp",
                category: "OTHER",
                date: new Date("2026-06-02T00:00:00.000Z"),
                member: null
            })
        ] as never);

        const stats = await getAdminFinanceData();

        const income = stats.transactions.find((t) => t.id === "tx_in");
        const expense = stats.transactions.find((t) => t.id === "tx_out");
        expect(income?.type).toBe("INNTEKT");
        expect(income?.amount).toBe(750);
        expect(income?.member).toEqual({ firstName: "A", lastName: "B", email: "a@b.no" });
        expect(expense?.type).toBe("UTGIFT");
        expect(expense?.amount).toBe(-300);
        expect(expense?.member).toBeUndefined();
    });

    it("merges split transactions that share date + base description + category, summing amounts", async () => {
        const date = new Date("2026-06-03T00:00:00.000Z");
        prismaMock.transaction.findMany.mockResolvedValue([
            makeTransaction({
                id: "tx_a",
                amount: dec(200),
                description: "Dugnad (Splittet)",
                category: "OTHER",
                date,
                member: null
            }),
            makeTransaction({
                id: "tx_b",
                amount: dec(300),
                description: "Dugnad",
                category: "OTHER",
                date,
                member: null
            })
        ] as never);

        const stats = await getAdminFinanceData();

        // Both collapse to the same key; amounts add up; description has "(Splittet)" stripped.
        expect(stats.transactions).toHaveLength(1);
        expect(stats.transactions[0].description).toBe("Dugnad");
        expect(stats.transactions[0].amount).toBe(500);
    });

    it("returns at most 10 grouped transactions", async () => {
        const many = Array.from({ length: 15 }, (_, i) =>
            makeTransaction({
                id: `tx_${i}`,
                amount: dec(100 + i),
                description: `Tx ${i}`,
                category: "OTHER",
                date: new Date(2026, 5, (i % 28) + 1),
                member: null
            })
        );
        prismaMock.transaction.findMany.mockResolvedValue(many as never);

        const stats = await getAdminFinanceData();

        expect(stats.transactions).toHaveLength(10);
    });

    it("maps member balances to numbers", async () => {
        // The 8th query (member balances) issues its own findMany calls; first returns 5 non-zero.
        prismaMock.member.findMany
            // call 1 = income-projection members (deletedAt:null, select membershipType)
            .mockResolvedValueOnce([] as never)
            // call 2 = non-zero balance members
            .mockResolvedValueOnce([
                makeMember({ id: "mb1", balance: dec(1250), updatedAt: new Date("2026-06-04T00:00:00.000Z") }),
                makeMember({ id: "mb2", balance: dec(-50), updatedAt: new Date("2026-06-03T00:00:00.000Z") })
            ] as never);

        const stats = await getAdminFinanceData();

        expect(stats.memberBalances.map((m) => m.balance)).toEqual([1250, -50]);
        expect(typeof stats.memberBalances[0].balance).toBe("number");
    });

    it("backfills with zero-balance members when fewer than 5 have a non-zero balance", async () => {
        prismaMock.member.findMany
            .mockResolvedValueOnce([] as never) // income-projection members
            .mockResolvedValueOnce([
                makeMember({ id: "nz1", balance: dec(100), updatedAt: new Date("2026-06-04T00:00:00.000Z") })
            ] as never) // non-zero (only 1)
            .mockResolvedValueOnce([
                makeMember({ id: "z1", balance: dec(0), updatedAt: new Date("2026-06-02T00:00:00.000Z") }),
                makeMember({ id: "z2", balance: dec(0), updatedAt: new Date("2026-06-01T00:00:00.000Z") })
            ] as never); // zero-balance backfill (4 slots, returns 2)

        const stats = await getAdminFinanceData();

        // Combined list sorted by updatedAt desc: nz1, z1, z2
        expect(stats.memberBalances.map((m) => m.id)).toEqual(["nz1", "z1", "z2"]);
        // The zero-balance backfill query targets balance: 0, non-deleted, with the remaining take.
        expect(prismaMock.member.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { deletedAt: null, balance: 0 },
                take: 4
            })
        );
    });

    it("does not run the zero-balance backfill when 5 non-zero balances are found", async () => {
        const fiveNonZero = Array.from({ length: 5 }, (_, i) =>
            makeMember({ id: `nz_${i}`, balance: dec(10 + i), updatedAt: new Date(2026, 5, i + 1) })
        );
        prismaMock.member.findMany
            .mockResolvedValueOnce([] as never) // income-projection members
            .mockResolvedValueOnce(fiveNonZero as never); // five non-zero

        const stats = await getAdminFinanceData();

        expect(stats.memberBalances).toHaveLength(5);
        // Only the income-projection findMany + the non-zero balance findMany ran (2 total).
        expect(prismaMock.member.findMany).toHaveBeenCalledTimes(2);
    });

    it("excludes soft-deleted members from the balance widget query", async () => {
        prismaMock.member.findMany
            .mockResolvedValueOnce([] as never)
            .mockResolvedValueOnce([] as never) // non-zero
            .mockResolvedValueOnce([] as never); // backfill

        await getAdminFinanceData();

        // Non-zero balance widget query.
        expect(prismaMock.member.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { deletedAt: null, balance: { not: 0 } },
                take: 5,
                orderBy: { updatedAt: "desc" }
            })
        );
    });

    it("degrades gracefully when individual queries fail (allSettled fallbacks)", async () => {
        // Treasury aggregate rejects; everything else uses defaults.
        prismaMock.transaction.aggregate
            .mockRejectedValueOnce(new Error("boom") as never) // treasury -> {sum:null}
            .mockResolvedValueOnce(aggSum(900) as never) // income
            .mockResolvedValueOnce(aggSum(-100) as never); // expense
        prismaMock.transaction.findMany.mockRejectedValue(new Error("boom") as never);
        prismaMock.member.findMany.mockRejectedValue(new Error("boom") as never);
        prismaMock.membershipType.findMany.mockRejectedValue(new Error("boom") as never);
        prismaMock.paymentRequest.findMany.mockRejectedValue(new Error("boom") as never);

        const stats = await getAdminFinanceData();

        expect(stats.treasuryBalance).toBe(0);
        expect(stats.totalIncome).toBe(900);
        expect(stats.totalExpenses).toBe(-100);
        expect(stats.transactions).toEqual([]);
        expect(stats.memberBalances).toEqual([]);
        expect(stats.expectedMembershipIncome).toBe(0);
        expect(stats.expectedInvoiceIncome).toBe(0);
        expect(stats.expectedAnnualIncome).toBe(0);
    });
});

describe("syncClerkRoleMetadata", () => {
    it("skips (no Clerk write) when clerkId is null", async () => {
        const res = await syncClerkRoleMetadata({ clerkId: null, roleId: "role_1", legacyRole: "ADMIN" });

        expect(res).toEqual({ success: false, skipped: true });
    });

    it("updates Clerk public metadata with role, roleId and source on success", async () => {
        const updateUserMetadata = vi.fn(async () => undefined);
        vi.mocked(clerkClient).mockResolvedValue({
            users: { updateUserMetadata }
        } as never);

        const res = await syncClerkRoleMetadata({
            clerkId: "clerk_abc",
            roleId: "role_42",
            legacyRole: "MODERATOR"
        });

        expect(res).toEqual({ success: true, skipped: false });
        expect(updateUserMetadata).toHaveBeenCalledWith("clerk_abc", {
            publicMetadata: {
                role: "MODERATOR",
                roleId: "role_42",
                source: "admin_role_update"
            }
        });
    });

    it("returns a non-skipped error result when the Clerk update throws", async () => {
        const updateUserMetadata = vi.fn(async () => {
            throw new Error("Clerk API down");
        });
        vi.mocked(clerkClient).mockResolvedValue({
            users: { updateUserMetadata }
        } as never);

        const res = await syncClerkRoleMetadata({
            clerkId: "clerk_abc",
            roleId: "role_42",
            legacyRole: "MEMBER"
        });

        expect(res).toEqual({
            success: false,
            skipped: false,
            error: "Rollen ble oppdatert, men Clerk metadata ble ikke oppdatert."
        });
    });

    it("returns the error result when obtaining the Clerk client itself rejects", async () => {
        vi.mocked(clerkClient).mockRejectedValue(new Error("network") as never);

        const res = await syncClerkRoleMetadata({
            clerkId: "clerk_abc",
            roleId: "role_1",
            legacyRole: "ADMIN"
        });

        expect(res.success).toBe(false);
        expect((res as { skipped: boolean }).skipped).toBe(false);
    });
});
