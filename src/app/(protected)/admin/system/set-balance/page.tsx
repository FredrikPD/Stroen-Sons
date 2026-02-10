import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import SetBalancePageClient from "./client";

export const metadata = {
    title: "Sett Saldo",
};

export default async function SetBalancePage() {
    await ensureRole([Role.ADMIN]);
    return <SetBalancePageClient />;
}
