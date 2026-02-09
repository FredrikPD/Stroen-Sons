import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import CreateInvoicePageClient from "./client";

export const metadata = {
    title: "Ny Faktura",
};

export default async function CreateInvoicePage() {
    await ensureRole([Role.ADMIN]);
    return <CreateInvoicePageClient />;
}
