import { NextResponse } from "next/server";
import { ensureMember } from "@/server/auth/ensureMember";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscribeBody = {
    subscription?: {
        endpoint?: string;
        expirationTime?: number | null;
        keys?: {
            p256dh?: string;
            auth?: string;
        };
    };
};

export async function POST(req: Request) {
    try {
        const member = await ensureMember();
        const body = (await req.json()) as SubscribeBody;
        const subscription = body.subscription;

        const endpoint = subscription?.endpoint?.trim();
        const p256dh = subscription?.keys?.p256dh?.trim();
        const auth = subscription?.keys?.auth?.trim();

        if (!endpoint || !p256dh || !auth) {
            return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
        }

        await db.pushSubscription.upsert({
            where: { endpoint },
            create: {
                memberId: member.id,
                endpoint,
                p256dh,
                auth,
                userAgent: req.headers.get("user-agent") || null,
                lastUsedAt: new Date(),
            },
            update: {
                memberId: member.id,
                p256dh,
                auth,
                userAgent: req.headers.get("user-agent") || null,
                lastUsedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}

export async function DELETE(req: Request) {
    try {
        const member = await ensureMember();
        const body = await req.json() as { endpoint?: string };
        const endpoint = body.endpoint?.trim();

        if (!endpoint) {
            return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
        }

        await db.pushSubscription.deleteMany({
            where: {
                endpoint,
                memberId: member.id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
