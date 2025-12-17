import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";

// GET /api/events
export async function GET(req: NextRequest) {
    try {
        const member = await ensureMember();
        if (!member) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const events = await prisma.event.findMany({
            orderBy: {
                startAt: "asc",
            },
            include: {
                _count: {
                    select: { attendees: true },
                },
                attendees: {
                    take: 3, // Get first 3 for avatar stack
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true, // Assuming keeping simple mostly for images if available, or initials
                        // We might need profileImage or similar if it exists on Member, but schema says firstName/lastName
                        // checking schema again... Member has no image field, so we use Initials.
                    }
                }
            },
        });

        return NextResponse.json(events);
    } catch (error) {
        console.error("[EVENTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
