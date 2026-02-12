import { NextResponse } from "next/server";
import { ensureMember } from "@/server/auth/ensureMember";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const member = await ensureMember();

        const notifications = await db.notification.findMany({
            where: { memberId: member.id },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                title: true,
                message: true,
                link: true,
                createdAt: true,
                read: true,
            },
        });

        return NextResponse.json({ notifications });
    } catch {
        return NextResponse.json({ notifications: [] }, { status: 401 });
    }
}
