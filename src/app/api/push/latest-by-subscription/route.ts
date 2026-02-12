import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
    endpoint?: string;
};

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Body;
        const endpoint = body.endpoint?.trim();

        if (!endpoint) {
            return NextResponse.json({ notifications: [] }, { status: 400 });
        }

        const subscription = await db.pushSubscription.findUnique({
            where: { endpoint },
            select: { memberId: true },
        });

        if (!subscription) {
            return NextResponse.json({ notifications: [] });
        }

        const notifications = await db.notification.findMany({
            where: { memberId: subscription.memberId },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                type: true,
                title: true,
                message: true,
                link: true,
                createdAt: true,
                read: true,
            },
        });

        return NextResponse.json({ notifications });
    } catch {
        return NextResponse.json({ notifications: [] }, { status: 500 });
    }
}
