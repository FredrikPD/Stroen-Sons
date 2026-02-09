import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import { getInvoiceFormData } from "@/server/actions/invoices";
import InvoiceDeleteClient from "./client";

export const metadata = {
    title: "Slett Fakturaer",
};

export default async function InvoiceDeletePage() {
    await ensureRole([Role.ADMIN]);
    const { members } = await getInvoiceFormData();

    return (
        <InvoiceDeleteClient members={members} />
    );
}
