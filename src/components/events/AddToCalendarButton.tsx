"use client";

import React, { useEffect, useState } from "react";

type Props = {
    event: {
        id: string;
        title: string;
        description?: string | null;
        location?: string | null;
        startAt: string;
        endAt?: string | null;
    };
};

export default function AddToCalendarButton({ event }: Props) {
    const [baseUrl, setBaseUrl] = useState<string>("");

    useEffect(() => {
        setBaseUrl(window.location.host);
    }, []);


    // Use webcal protocal to force open the calendar app
    // We changed the API to use METHOD:REQUEST to hopefully avoid the "Subscribe" dialog
    const icsUrl = `webcal://${baseUrl}/api/events/${event.id}/ics`;

    return (
        <a
            href={icsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
            <span className="material-symbols-outlined text-lg">calendar_add_on</span>
            Legg til i kalender
        </a>
    );
}
