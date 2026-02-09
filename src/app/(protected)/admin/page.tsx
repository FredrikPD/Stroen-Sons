import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import AdminDashboardClientPage from "./client";

export const metadata = {
    title: "Admin Dashboard",
};

export default async function AdminDashboardPage() {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);

    return <AdminDashboardClientPage />;
}
