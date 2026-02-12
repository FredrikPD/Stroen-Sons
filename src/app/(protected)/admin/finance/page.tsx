import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import FinancePortalClientPage from "./client";
import { getAdminFinanceData } from "@/server/dashboard/getAdminFinanceData";

export const metadata = {
    title: "Økonomi",
};

export default async function AdminFinancePage() {
    await ensureRole([Role.ADMIN]);
    const data = await getAdminFinanceData();

    return <FinancePortalClientPage initialData={data} />;
}
