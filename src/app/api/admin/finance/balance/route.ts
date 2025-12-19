import { db } from "@/server/db";
import { getCurrentMember } from "@/server/actions/finance";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET() {
    try {
        const currentMember = await getCurrentMember();

        if (!currentMember || currentMember.role !== "ADMIN") {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Define the type explicitly to ensure TypeScript understands the included relation
        type MemberWithRequests = Prisma.MemberGetPayload<{
            include: { paymentRequests: true }
        }>;

        const members = await db.member.findMany({
            include: {
                paymentRequests: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            },
            orderBy: {
                firstName: 'asc'
            }
        }) as unknown as MemberWithRequests[];

        // Format data for the frontend
        const memberData = members.map(member => ({
            id: member.id,
            name: `${member.firstName} ${member.lastName}`,
            email: member.email,
            balance: member.balance.toNumber(),
            unpaidCount: member.paymentRequests.filter(r => r.status === "PENDING").length,
            requests: member.paymentRequests.map(req => ({
                id: req.id,
                title: req.title, // Use title instead of period
                amount: req.amount,
                status: req.status, // "PENDING" | "PAID" | "WAIVED"
                dueDate: req.dueDate,
                category: req.category
            }))
        }));

        return NextResponse.json(memberData);

    } catch (error) {
        console.error("Error fetching balance data:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
