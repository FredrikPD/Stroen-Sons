
import { getEventCategories } from "@/server/actions/event-categories";
import { EventCategoriesClient } from "./EventCategoriesClient";

export const metadata = {
    title: "Arrangementer Kategorier",
};

import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";

export default async function EventCategoriesPage() {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);
    const { data } = await getEventCategories();

    return (
        <EventCategoriesClient initialCategories={data || []} />
    );
}
