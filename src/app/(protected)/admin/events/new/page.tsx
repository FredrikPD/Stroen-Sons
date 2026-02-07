import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import CreateEventClientPage from "./client";

export default async function CreateEventPage() {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);

    return <CreateEventClientPage />;
}
