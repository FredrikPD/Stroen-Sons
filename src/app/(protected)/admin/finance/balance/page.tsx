import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import MemberBalancePageClient from "./client";

export const metadata = {
    title: "Saldooversikt",
};

export default async function MemberBalancePage() {
    await ensureRole([Role.ADMIN]);
    return <MemberBalancePageClient />;
}
