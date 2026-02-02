"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createEvent } from "@/server/actions/events";
import { EventForm } from "@/components/events/EventForm";
import { EventInput } from "@/lib/validators/events";

export default function CreateEventPage() {
    const router = useRouter();

    const handleSubmit = async (data: EventInput) => {
        const result = await createEvent(data);
        if (result.success) {
            // Redirect to the events list or admin dashboard
            router.push("/admin/events");
        }
        return result;
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <Link
                    href="/admin"
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Nytt Arrangement</h1>
                    <p className="text-gray-500 text-sm">Fyll inn detaljene for det nye arrangementet.</p>
                </div>
            </div>

            <EventForm
                onSubmit={handleSubmit}
                submitButtonText="Opprett Arrangement"
            />
        </div>
    );
}
