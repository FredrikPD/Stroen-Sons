import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import AdminDashboardClientPage from "./client";
import { getAdminDashboardData } from "@/server/dashboard/getAdminDashboardData";

export const metadata = {
    title: "Admin Dashboard",
};

export default async function AdminDashboardPage() {
    const member = await ensureRole([Role.ADMIN, Role.MODERATOR]);
    const data = await getAdminDashboardData(member);

    return <AdminDashboardClientPage initialData={data} />;
}
