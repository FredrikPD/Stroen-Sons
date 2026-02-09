import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import AdminSystemClientPage from "./client";

export const metadata = {
    title: "Systeminnstillinger",
};

export default async function AdminSystemPage() {
    await ensureRole([Role.ADMIN]);

    return <AdminSystemClientPage />;
}
