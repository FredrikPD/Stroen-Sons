
import { Metadata } from "next";
import { getMyEvents } from "@/server/actions/my-events";
import MyEventsClient from "./MyEventsClient";

export const metadata: Metadata = {
    title: "Mine Arrangementer",
    description: "Oversikt over dine arrangementer og påmeldinger",
};

import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";

export default async function MyEventsPage() {
    try {
        await ensureMember();
    } catch (e) {
        redirect("/sign-in");
    }

    const { success, data, error } = await getMyEvents();

    if (!success || !data) {
        return (
            <div className="text-center py-8 rounded-xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-400 italic" style={{ fontFamily: "'Georgia', serif" }}>
                    {error || "Kunne ikke laste arrangementer."}
                </p>
            </div>
        );
    }

    return (
        <MyEventsClient initialData={data} />
    );
}
