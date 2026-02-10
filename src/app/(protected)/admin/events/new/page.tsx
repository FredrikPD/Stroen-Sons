import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import CreateEventClientPage from "./client";

export const metadata = {
    title: "Nytt Arrangement",
};

export default async function NewEventPage() {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);

    return <CreateEventClientPage />;
}
