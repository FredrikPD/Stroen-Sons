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

    if (member.role !== "ADMIN" && member.role !== "MODERATOR") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Determine current period (YYYY-MM)
    const now = new Date();
    const period = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}`;

    const [nextEvent, memberCount, treasurySum, paidCount] = await Promise.all([
        prisma.event.findFirst({
            where: { startAt: { gte: new Date() } },
            orderBy: { startAt: "asc" },
        }),
        prisma.member.count(),
        prisma.transaction.aggregate({
            _sum: { amount: true },
        }),
        prisma.payment.count({
            where: {
                period: period,
                status: "PAID",
            }
        })
    ]);

    const unpaidCount = Math.max(0, memberCount - paidCount);

    return NextResponse.json({
        firstName: member.firstName,
        role: member.role,
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
