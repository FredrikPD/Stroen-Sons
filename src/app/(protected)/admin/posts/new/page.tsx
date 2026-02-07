import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import NewPostClientPage from "./client";

export default async function NewPostPage() {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);

    return <NewPostClientPage />;
}
