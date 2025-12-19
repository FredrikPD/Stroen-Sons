
import { Metadata } from "next";
import { getMyEvents } from "@/server/actions/my-events";
import MyEventsClient from "./MyEventsClient";

export const metadata: Metadata = {
    title: "Mine Arrangementer | Strøen Søns",
    description: "Oversikt over dine arrangementer og påmeldinger",
};

export default async function MyEventsPage() {
    const { success, data, error } = await getMyEvents();

    if (!success || !data) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-red-500">error</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Noe gikk galt</h2>
                <p className="text-gray-500 max-w-sm">{error || "Kunne ikke laste arrangementer."}</p>
            </div>
        );
    }

    return (
        <MyEventsClient initialData={data} />
    );
}
