import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import InvoicesPageClient from "./client";

export const metadata = {
    title: "Fakturaoversikt",
};

export default async function InvoicesPage() {
    await ensureRole([Role.ADMIN]);
    return <InvoicesPageClient />;
}
