import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import ExpensesPageClient from "./client";

export const metadata = {
    title: "Utgifter",
};

export default async function ExpensesPage() {
    await ensureRole([Role.ADMIN]);
    return <ExpensesPageClient />;
}
