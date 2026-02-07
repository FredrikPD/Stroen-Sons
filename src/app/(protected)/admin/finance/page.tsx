import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import FinancePortalClientPage from "./client";

export default async function FinancePortalPage() {
    await ensureRole([Role.ADMIN]);

    return <FinancePortalClientPage />;
}
