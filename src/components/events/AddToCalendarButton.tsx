"use strict";
import React from "react";

type AddToCalendarButtonProps = {
    event: {
        id: string;
    };
};

export default function AddToCalendarButton({ event }: AddToCalendarButtonProps) {
    // Relative URL to the API route that forces download
    const icsUrl = `/api/events/${event.id}/ics`;

    return (
        <a
            href={icsUrl}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
            <span className="material-symbols-outlined text-lg">calendar_add_on</span>
            Legg til kalender
        </a>
    );
}
