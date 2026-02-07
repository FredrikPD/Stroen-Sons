"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createEvent } from "@/server/actions/events";
import { EventForm } from "@/components/events/EventForm";
import { EventInput } from "@/lib/validators/events";

export default function CreateEventClientPage() {
    const router = useRouter();

    const handleSubmit = async (data: EventInput) => {
        return await createEvent(data);
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Nytt Arrangement</h1>
                    <p className="text-gray-500 text-sm">Fyll inn detaljene for det nye arrangementet.</p>
                </div>
            </div>

            <EventForm
                onSubmit={handleSubmit}
                submitButtonText="Opprett Arrangement"
                redirectOnSuccess="/admin/events"
            />
        </div>
    );
}
