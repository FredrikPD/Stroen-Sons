import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    let member;
    try {
        member = await ensureMember();
    } catch (err) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for Admin, Moderator, OR any custom role with allowed paths
    const hasAccess =
        member.role === "ADMIN" ||
        member.role === "MODERATOR" ||
        (member.userRole?.allowedPaths && member.userRole.allowedPaths.length > 0);

    if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Determine current month window
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

    // If no membership fee requests exist, return -1 to signal "No Invoices"
    // Otherwise, return the number of unpaid (pending) membership fee requests
    const unpaidCount = totalMembershipRequests === 0 ? -1 : unpaidMembershipRequests;

    return NextResponse.json({
        firstName: member.firstName,
        role: member.role,
        userRole: member.userRole, // Send dynamic role data to client
        memberCount,
        unpaidCount,
        treasuryBalance: treasurySum._sum.amount?.toNumber() ?? 0,
        nextEvent: nextEvent ? {
            ...nextEvent,
            startAt: nextEvent.startAt.toISOString(),
            coverImage: "https://weblium.com/blog/wp-content/uploads/2019/12/imgonline-com-ua-Compressed-8vwTmURAw7-1344x734.jpg"
        } : null,
    });
}
