import "server-only";

import { prisma } from "@/server/db";
import type { AdminDashboardData } from "@/lib/admin-dashboard";

type AdminDashboardMember = {
    firstName: string | null;
    role: string;
    userRole: any;
};

export async function getAdminDashboardData(member: AdminDashboardMember): Promise<AdminDashboardData> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [nextEvent, memberCount, treasurySum, totalMembershipRequests, unpaidMembershipRequests] = await Promise.all([
        prisma.event.findFirst({
            where: { startAt: { gte: new Date() } },
            orderBy: { startAt: "asc" },
        }),
        prisma.member.count(),
        prisma.transaction.aggregate({
            _sum: { amount: true },
        }),
        prisma.paymentRequest.count({
            where: {
                category: "MEMBERSHIP_FEE",
                dueDate: {
                    gte: startOfMonth,
                    lt: startOfNextMonth,
                },
            }
        }),
        prisma.paymentRequest.count({
            where: {
                category: "MEMBERSHIP_FEE",
                status: "PENDING",
                dueDate: {
                    gte: startOfMonth,
                    lt: startOfNextMonth,
                },
            }
        })
    ]);

    const unpaidCount = totalMembershipRequests === 0 ? -1 : unpaidMembershipRequests;

    return {
        firstName: member.firstName,
        role: member.role,
        userRole: member.userRole,
        memberCount,
        unpaidCount,
        treasuryBalance: treasurySum._sum.amount?.toNumber() ?? 0,
        nextEvent: nextEvent ? {
            ...nextEvent,
            startAt: nextEvent.startAt.toISOString(),
            coverImage: "https://weblium.com/blog/wp-content/uploads/2019/12/imgonline-com-ua-Compressed-8vwTmURAw7-1344x734.jpg"
        } : null,
    };
}
