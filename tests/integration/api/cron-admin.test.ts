import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeAdmin, makeMember } from "../../helpers/fixtures";
import { loginAsAdmin, loginAsMember, logout, ensureMemberMock } from "../../helpers/auth";

// --- Per-file module mocks for everything the routes import ---

// Cron route imports sendInvoiceDeadlineReminders from notifications.
vi.mock("@/server/actions/notifications", () => ({
    createNotification: vi.fn(async () => undefined),
    createManyNotifications: vi.fn(async () => undefined),
    createNotificationsForMembers: vi.fn(async () => undefined),
    broadcastNotification: vi.fn(async () => undefined),
    notifyNewPhotos: vi.fn(async () => undefined),
    sendInvoiceDeadlineReminders: vi.fn(async () => ({
        success: true,
        dueSoonCount: 0,
        dueTodayCount: 0
    }))
}));

// Balance route reads the caller via getCurrentMember from the finance action module.
vi.mock("@/server/actions/finance", () => ({
    getCurrentMember: vi.fn(async () => null)
}));

// Dashboard + finance routes delegate to these server-only data loaders.
vi.mock("@/server/dashboard/getAdminDashboardData", () => ({
    getAdminDashboardData: vi.fn(async () => ({}))
}));
vi.mock("@/server/dashboard/getAdminFinanceData", () => ({
    getAdminFinanceData: vi.fn(async () => ({}))
}));

import { GET as cronGET } from "@/app/api/cron/invoice-deadlines/route";
import { GET as dashboardGET } from "@/app/api/admin/dashboard/route";
import { GET as financeGET } from "@/app/api/admin/finance/route";
import { GET as balanceGET } from "@/app/api/admin/finance/balance/route";

import { sendInvoiceDeadlineReminders } from "@/server/actions/notifications";
import { getCurrentMember } from "@/server/actions/finance";
import { getAdminDashboardData } from "@/server/dashboard/getAdminDashboardData";
import { getAdminFinanceData } from "@/server/dashboard/getAdminFinanceData";
import { prismaMock } from "../../helpers/prisma";
import { dec } from "../../helpers/fixtures";

const remindersMock = vi.mocked(sendInvoiceDeadlineReminders);
const getCurrentMemberMock = vi.mocked(getCurrentMember);
const getAdminDashboardDataMock = vi.mocked(getAdminDashboardData);
const getAdminFinanceDataMock = vi.mocked(getAdminFinanceData);

/** Build a Request with the given Authorization header (if any). */
function makeRequest(authorization?: string) {
    const headers: Record<string, string> = {};
    if (authorization !== undefined) {
        headers["authorization"] = authorization;
    }
    return new Request("http://localhost/api/cron/invoice-deadlines", { headers });
}

// ---------------------------------------------------------------------------
// GET /api/cron/invoice-deadlines
// ---------------------------------------------------------------------------
describe("GET /api/cron/invoice-deadlines", () => {
    const ORIGINAL_SECRET = process.env.CRON_SECRET;

    beforeEach(() => {
        process.env.CRON_SECRET = "test-cron-secret";
        remindersMock.mockResolvedValue({ success: true, dueSoonCount: 0, dueTodayCount: 0 });
    });

    afterEach(() => {
        if (ORIGINAL_SECRET === undefined) {
            delete process.env.CRON_SECRET;
        } else {
            process.env.CRON_SECRET = ORIGINAL_SECRET;
        }
    });

    it("returns 401 when the Authorization header is missing", async () => {
        const res = await cronGET(makeRequest() as never);
        expect(res.status).toBe(401);
        await expect(res.text()).resolves.toBe("Unauthorized");
        expect(remindersMock).not.toHaveBeenCalled();
    });

    it("returns 401 when the bearer token is wrong", async () => {
        const res = await cronGET(makeRequest("Bearer wrong-secret") as never);
        expect(res.status).toBe(401);
        expect(remindersMock).not.toHaveBeenCalled();
    });

    it("returns 401 when the header has the right value but the wrong scheme", async () => {
        const res = await cronGET(makeRequest("test-cron-secret") as never);
        expect(res.status).toBe(401);
        expect(remindersMock).not.toHaveBeenCalled();
    });

    it("runs the reminder job and returns the counts on the success path", async () => {
        remindersMock.mockResolvedValue({ success: true, dueSoonCount: 3, dueTodayCount: 2 });

        const res = await cronGET(makeRequest("Bearer test-cron-secret") as never);

        expect(res.status).toBe(200);
        expect(remindersMock).toHaveBeenCalledTimes(1);
        await expect(res.json()).resolves.toEqual({
            success: true,
            dueSoonCount: 3,
            dueTodayCount: 2
        });
    });

    it("returns 500 when the reminder job reports failure", async () => {
        remindersMock.mockResolvedValue({ success: false, dueSoonCount: 0, dueTodayCount: 0 });

        const res = await cronGET(makeRequest("Bearer test-cron-secret") as never);

        expect(res.status).toBe(500);
        await expect(res.json()).resolves.toEqual({
            success: false,
            error: "Failed to send invoice deadline reminders"
        });
    });

    it("returns 500 when the reminder job throws", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        remindersMock.mockRejectedValue(new Error("boom"));

        const res = await cronGET(makeRequest("Bearer test-cron-secret") as never);

        expect(res.status).toBe(500);
        await expect(res.json()).resolves.toEqual({
            success: false,
            error: "Internal Server Error"
        });
        consoleSpy.mockRestore();
    });

    it("treats an undefined CRON_SECRET as not matching a bearer of literal 'undefined'", async () => {
        delete process.env.CRON_SECRET;
        // A caller cannot guess the secret; a normal bearer is rejected.
        const res = await cronGET(makeRequest("Bearer test-cron-secret") as never);
        expect(res.status).toBe(401);
        expect(remindersMock).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// GET /api/admin/dashboard
// ---------------------------------------------------------------------------
describe("GET /api/admin/dashboard", () => {
    beforeEach(() => {
        getAdminDashboardDataMock.mockResolvedValue({} as never);
    });

    it("returns 401 when ensureMember rejects (unauthenticated)", async () => {
        logout();
        const res = await dashboardGET();
        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
        expect(getAdminDashboardDataMock).not.toHaveBeenCalled();
    });

    it("returns 403 for a plain MEMBER with no privileged role", async () => {
        loginAsMember({ role: "MEMBER", userRole: null });
        const res = await dashboardGET();
        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
        expect(getAdminDashboardDataMock).not.toHaveBeenCalled();
    });

    it("allows an ADMIN and returns the dashboard payload", async () => {
        const member = loginAsAdmin();
        const payload = { firstName: "Test", role: "ADMIN", memberCount: 5 };
        getAdminDashboardDataMock.mockResolvedValue(payload as never);

        const res = await dashboardGET();

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual(payload);
        expect(getAdminDashboardDataMock).toHaveBeenCalledWith(member);
    });

    it("allows a MODERATOR", async () => {
        loginAsMember({ role: "MODERATOR", userRole: null });
        getAdminDashboardDataMock.mockResolvedValue({ ok: true } as never);

        const res = await dashboardGET();

        expect(res.status).toBe(200);
        expect(getAdminDashboardDataMock).toHaveBeenCalledTimes(1);
    });

    it("allows a MEMBER who has a custom userRole with allowedPaths", async () => {
        loginAsMember({
            role: "MEMBER",
            userRole: { id: "role_1", name: "Editor", allowedPaths: ["/admin/posts"] }
        });
        getAdminDashboardDataMock.mockResolvedValue({ ok: true } as never);

        const res = await dashboardGET();

        expect(res.status).toBe(200);
        expect(getAdminDashboardDataMock).toHaveBeenCalledTimes(1);
    });

    it("forbids a MEMBER whose custom userRole has an empty allowedPaths list", async () => {
        loginAsMember({
            role: "MEMBER",
            userRole: { id: "role_1", name: "Empty", allowedPaths: [] }
        });

        const res = await dashboardGET();

        expect(res.status).toBe(403);
        expect(getAdminDashboardDataMock).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// GET /api/admin/finance
// ---------------------------------------------------------------------------
describe("GET /api/admin/finance", () => {
    beforeEach(() => {
        getAdminFinanceDataMock.mockResolvedValue({} as never);
    });

    it("returns 401 when ensureMember rejects (unauthenticated)", async () => {
        logout();
        const res = await financeGET();
        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
        expect(getAdminFinanceDataMock).not.toHaveBeenCalled();
    });

    it("returns 403 for a MODERATOR (finance is ADMIN-only)", async () => {
        loginAsMember({ role: "MODERATOR" });
        const res = await financeGET();
        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toEqual({ error: "Forbidden" });
        expect(getAdminFinanceDataMock).not.toHaveBeenCalled();
    });

    it("returns 403 for a plain MEMBER even with a custom userRole", async () => {
        loginAsMember({
            role: "MEMBER",
            userRole: { id: "role_1", name: "Editor", allowedPaths: ["/admin/posts"] }
        });
        const res = await financeGET();
        expect(res.status).toBe(403);
        expect(getAdminFinanceDataMock).not.toHaveBeenCalled();
    });

    it("allows an ADMIN and returns the finance payload", async () => {
        loginAsAdmin();
        const payload = { treasuryBalance: 1234, totalIncome: 5000, totalExpenses: -100 };
        getAdminFinanceDataMock.mockResolvedValue(payload as never);

        const res = await financeGET();

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual(payload);
        expect(getAdminFinanceDataMock).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// GET /api/admin/finance/balance
// ---------------------------------------------------------------------------
describe("GET /api/admin/finance/balance", () => {
    it("returns 401 when there is no current member", async () => {
        getCurrentMemberMock.mockResolvedValue(null);
        const res = await balanceGET();
        expect(res.status).toBe(401);
        await expect(res.text()).resolves.toBe("Unauthorized");
        expect(prismaMock.member.findMany).not.toHaveBeenCalled();
    });

    it("returns 401 when the current member is not an ADMIN", async () => {
        getCurrentMemberMock.mockResolvedValue({ ...makeMember({ role: "MEMBER" }), balance: 0 } as never);
        const res = await balanceGET();
        expect(res.status).toBe(401);
        expect(prismaMock.member.findMany).not.toHaveBeenCalled();
    });

    it("returns 401 for a MODERATOR (balance view is ADMIN-only)", async () => {
        getCurrentMemberMock.mockResolvedValue({ ...makeMember({ role: "MODERATOR" }), balance: 0 } as never);
        const res = await balanceGET();
        expect(res.status).toBe(401);
        expect(prismaMock.member.findMany).not.toHaveBeenCalled();
    });

    it("returns formatted member balances for an ADMIN", async () => {
        getCurrentMemberMock.mockResolvedValue({ ...makeAdmin(), balance: 0 } as never);

        prismaMock.member.findMany.mockResolvedValue([
            {
                id: "m1",
                firstName: "Ola",
                lastName: "Nordmann",
                email: "ola@example.com",
                avatarUrl: "https://img/ola.png",
                balance: dec(150.5),
                paymentRequests: [
                    {
                        id: "r1",
                        title: "Kontingent juni",
                        amount: dec(750),
                        status: "PENDING",
                        dueDate: new Date("2026-06-30T00:00:00.000Z"),
                        category: "MEMBERSHIP_FEE"
                    },
                    {
                        id: "r2",
                        title: "Kontingent mai",
                        amount: dec(750),
                        status: "PAID",
                        dueDate: new Date("2026-05-30T00:00:00.000Z"),
                        category: "MEMBERSHIP_FEE"
                    },
                    {
                        id: "r3",
                        title: "Cup",
                        amount: dec(200),
                        status: "PENDING",
                        dueDate: null,
                        category: "OTHER"
                    }
                ]
            }
        ] as never);

        const res = await balanceGET();

        expect(res.status).toBe(200);
        const body = await res.json();

        // One member, only deletedAt:null members fetched.
        expect(prismaMock.member.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { deletedAt: null } })
        );
        expect(body).toHaveLength(1);
        const m = body[0];
        expect(m.id).toBe("m1");
        expect(m.name).toBe("Ola Nordmann");
        expect(m.email).toBe("ola@example.com");
        expect(m.avatarUrl).toBe("https://img/ola.png");
        // Decimal balance is serialized to a number.
        expect(m.balance).toBe(150.5);
        // unpaidCount counts only PENDING requests.
        expect(m.unpaidCount).toBe(2);
        // requests carry amount as a number and preserve title/status/category.
        expect(m.requests).toHaveLength(3);
        expect(m.requests[0]).toEqual(
            expect.objectContaining({
                id: "r1",
                title: "Kontingent juni",
                amount: 750,
                status: "PENDING",
                category: "MEMBERSHIP_FEE"
            })
        );
    });

    it("returns an empty array when there are no members", async () => {
        getCurrentMemberMock.mockResolvedValue({ ...makeAdmin(), balance: 0 } as never);
        prismaMock.member.findMany.mockResolvedValue([] as never);

        const res = await balanceGET();

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual([]);
    });

    it("returns 500 when the query throws", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        getCurrentMemberMock.mockResolvedValue({ ...makeAdmin(), balance: 0 } as never);
        prismaMock.member.findMany.mockRejectedValue(new Error("db down"));

        const res = await balanceGET();

        expect(res.status).toBe(500);
        await expect(res.text()).resolves.toBe("Internal Server Error");
        consoleSpy.mockRestore();
    });

    it("returns 500 when getCurrentMember itself throws", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        getCurrentMemberMock.mockRejectedValue(new Error("auth blew up"));

        const res = await balanceGET();

        expect(res.status).toBe(500);
        await expect(res.text()).resolves.toBe("Internal Server Error");
        consoleSpy.mockRestore();
    });
});

// A small guard to make sure ensureMember default (admin) is intact for the
// routes that rely on the global mock rather than getCurrentMember.
describe("auth default sanity", () => {
    it("ensureMember resolves to an ADMIN by default", async () => {
        const member = await ensureMemberMock();
        expect((member as { role: string }).role).toBe("ADMIN");
    });
});
