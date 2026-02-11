import { db } from "@/server/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const event = await db.event.findUnique({
        where: { id },
        select: {
            title: true,
            description: true,
            startAt: true,
            endAt: true,
            location: true,
            address: true,
        },
    });

    if (!event) {
        return new NextResponse("Event not found", { status: 404 });
    }

    // Format dates for ICS (YYYYMMDDTHHMMSSZ)
    const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const start = formatDate(event.startAt);
    const end = event.endAt ? formatDate(event.endAt) : formatDate(new Date(event.startAt.getTime() + 2 * 60 * 60 * 1000)); // Default 2 hours if no end time
    const now = formatDate(new Date());

    const description = event.description ? event.description.replace(/\n/g, "\\n") : "";
    const location = event.location && event.address
        ? `${event.location}, ${event.address}`
        : event.location || event.address || "";

    // Generate ICS content
    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//StroenSons//Events//NO",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        `DTSTAMP:${now}`,
        `UID:${id}@stroensons.no`,
        `DTSTART:${start}`,
        `DTEND:${end}`,
        `SUMMARY:${event.title}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR"
    ].join("\r\n");

    return new NextResponse(icsContent, {
        headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            // Force download with "attachment"
            "Content-Disposition": `attachment; filename="${event.title.replace(/[^a-zA-Z0-9]/g, "_")}.ics"`,
            "Cache-Control": "public, max-age=3600",
        },
    });
}
