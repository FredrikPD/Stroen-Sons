import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import CreateEventClientPage from "./client";
import { db } from "@/server/db";

export const metadata = {
    title: "Nytt Arrangement",
};

export default async function NewEventPage() {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);

    const categories = await db.eventCategory.findMany({
        orderBy: { name: 'asc' }
    });

    return <CreateEventClientPage categories={categories} />;
}
