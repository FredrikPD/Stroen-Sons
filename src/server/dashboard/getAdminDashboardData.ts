import "server-only";

import { prisma } from "@/server/db";
import type { AdminDashboardData } from "@/lib/admin-dashboard";
import { withPrismaRetry } from "@/server/prismaResilience";

type AdminDashboardMember = {
    firstName: string | null;
    role: string;
    userRole: unknown;
};

function resolveSettled<T>(result: PromiseSettledResult<T>, fallback: T, label: string): T {
    if (result.status === "fulfilled") {
        return result.value;
    }
    console.error(`[admin-dashboard] Failed to load ${label}:`, result.reason);
    return fallback;
}

export async function getAdminDashboardData(member: AdminDashboardMember): Promise<AdminDashboardData> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const settledData = await Promise.allSettled([
        withPrismaRetry(
            () =>
                prisma.event.findFirst({
                    where: { startAt: { gte: new Date() } },
                    orderBy: { startAt: "asc" },
                }),
            { operationName: "adminDashboard:getNextEvent" }
        ),
        withPrismaRetry(() => prisma.member.count(), { operationName: "adminDashboard:getMemberCount" }),
        withPrismaRetry(
            () =>
                prisma.transaction.aggregate({
                    _sum: { amount: true },
                }),
            { operationName: "adminDashboard:getTreasurySum" }
        ),
        withPrismaRetry(
            () =>
                prisma.paymentRequest.count({
                    where: {
                        category: "MEMBERSHIP_FEE",
                        dueDate: {
                            gte: startOfMonth,
                            lt: startOfNextMonth,
                        },
                    }
                }),
            { operationName: "adminDashboard:getTotalMembershipRequests" }
        ),
        withPrismaRetry(
            () =>
                prisma.paymentRequest.count({
                    where: {
                        category: "MEMBERSHIP_FEE",
                        status: "PENDING",
                        dueDate: {
                            gte: startOfMonth,
                            lt: startOfNextMonth,
                        },
                    }
                }),
            { operationName: "adminDashboard:getUnpaidMembershipRequests" }
        )
    ] as const);

    const nextEvent = resolveSettled(settledData[0], null, "next event");
    const memberCount = resolveSettled(settledData[1], 0, "member count");
    const treasurySum = resolveSettled(settledData[2], { _sum: { amount: null } }, "treasury sum");
    const totalMembershipRequests = resolveSettled(settledData[3], 0, "total membership requests");
    const unpaidMembershipRequests = resolveSettled(settledData[4], 0, "unpaid membership requests");

    const unpaidCount = totalMembershipRequests === 0 ? -1 : unpaidMembershipRequests;

    return {
        firstName: member.firstName,
        role: member.role,
        userRole: member.userRole,
        memberCount,
        unpaidCount,
        treasuryBalance: treasurySum._sum.amount ? Number(treasurySum._sum.amount) : 0,
        nextEvent: nextEvent ? {
            ...nextEvent,
            startAt: nextEvent.startAt.toISOString(),
            coverImage: "https://weblium.com/blog/wp-content/uploads/2019/12/imgonline-com-ua-Compressed-8vwTmURAw7-1344x734.jpg"
        } : null,
    };
}
