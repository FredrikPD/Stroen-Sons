import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import AllTransactionsPageClient from "./client";

export const metadata = {
    title: "Transaksjoner",
};

export default async function AllTransactionsPage() {
    await ensureRole([Role.ADMIN]);
    return <AllTransactionsPageClient />;
}
