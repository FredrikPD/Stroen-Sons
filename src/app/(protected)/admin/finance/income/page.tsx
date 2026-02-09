import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import IncomePageClient from "./client";

export const metadata = {
    title: "Inntekter",
};

export default async function IncomePage() {
    await ensureRole([Role.ADMIN]);
    return <IncomePageClient />;
}
