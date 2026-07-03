"use client";

import { useRouter } from "next/navigation";
import { createEvent } from "@/server/actions/events";
import { EventForm } from "@/components/events/EventForm";
import { ActionInfo } from "@/components/ui/ActionInfo";
import { AdminPageHeader } from "@/components/admin/ui";
import { EventInput } from "@/lib/validators/events";

export default function CreateEventClientPage({ categories = [] }: { categories?: any[] }) {
    const router = useRouter();

    const handleSubmit = async (data: EventInput) => {
        return await createEvent(data);
    };

    return (
        <div className="space-y-8 pb-12">
            <AdminPageHeader
                eyebrow="Arrangementer"
                title="Nytt Arrangement"
                description="Fyll inn detaljene for det nye arrangementet."
            />

            <ActionInfo
                variant="warning"
                icon="notifications_active"
                title="Hva skjer når du oppretter?"
                items={[
                    "Arrangementet blir publisert og synlig for alle medlemmer med en gang.",
                    "Alle medlemmer får et varsel i appen (og push-varsel på mobil hvis de har skrudd det på) – dette skjer uansett om du sender e-post eller ikke.",
                    "E-post sendes bare hvis du huker av «Send e-postvarsel».",
                ]}
            />

            <EventForm
                onSubmit={handleSubmit}
                submitButtonText="Opprett Arrangement"
                redirectOnSuccess="/admin/events"
                categories={categories}
            />
        </div>
    );
}
