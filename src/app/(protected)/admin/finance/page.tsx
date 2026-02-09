import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import FinancePortalClientPage from "./client";

export const metadata = {
    title: "Økonomi",
};

export default async function AdminFinancePage() {
    await ensureRole([Role.ADMIN]);

    return <FinancePortalClientPage />;
}
