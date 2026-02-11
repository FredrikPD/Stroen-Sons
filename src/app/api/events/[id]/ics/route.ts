import { prisma } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const event = await prisma.event.findUnique({
        where: { id },
    });

    if (!event) {
        return new NextResponse("Event not found", { status: 404 });
    }

    const formatDate = (date: Date) => {
        return date.toISOString().replace(/-|:|\.\d+/g, "");
    };

    const startDate = formatDate(event.startAt);
    let endDate = startDate;
    if (event.endAt) {
        endDate = formatDate(event.endAt);
    } else {
        const s = new Date(event.startAt);
        s.setHours(s.getHours() + 1);
        endDate = formatDate(s);
    }

    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//StroenSons//Events//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST", // Use REQUEST instead of PUBLISH to try to force "Add Event" instead of "Subscribe"
        "BEGIN:VEVENT",
        `UID:${event.id}@stroensons.no`,
        `DTSTAMP:${formatDate(new Date())}`,
        `ORGANIZER;CN=StroenSons:mailto:no-reply@stroensons.no`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${event.description || ""}`,
        `LOCATION:${event.location || ""}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    return new NextResponse(icsContent, {
        headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `inline; filename="${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics"`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    });
}
