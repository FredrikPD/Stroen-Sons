import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import FinancialReportsPageClient from "./client";

export const metadata = {
    title: "Rapporter",
};

export default async function FinancialReportsPage() {
    await ensureRole([Role.ADMIN]);
    return <FinancialReportsPageClient />;
}
