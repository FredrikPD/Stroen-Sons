import { db } from "@/server/db";
import { getCurrentMember } from "@/server/actions/finance";
import { NextResponse } from "next/server";

// ... imports

import { Prisma } from "@prisma/client";

export async function GET() {
    try {
        const currentMember = await getCurrentMember();

        if (!currentMember || currentMember.role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Define the type explicitly to ensure TypeScript understands the included relation
        type MemberWithPayments = Prisma.MemberGetPayload<{
            include: { payments: true }
        }>;

        const members = await db.member.findMany({
            include: {
                payments: {
                    orderBy: {
                        period: 'desc'
                    }
                }
            },
            orderBy: {
                firstName: 'asc'
            }
        }) as unknown as MemberWithPayments[];

        // Format data for the frontend
        const memberData = members.map(member => ({
            id: member.id,
            name: `${member.firstName} ${member.lastName}`,
            email: member.email,
            balance: member.balance.toNumber(),
            unpaidCount: member.payments.filter(p => p.status === "UNPAID").length,
            payments: member.payments.map(payment => ({
                id: payment.id,
                period: payment.period,
                amount: payment.amount,
                status: payment.status,
                paidAt: payment.paidAt
            }))
        }));

        return NextResponse.json(memberData);

    } catch (error) {
        console.error("Error fetching balance data:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
