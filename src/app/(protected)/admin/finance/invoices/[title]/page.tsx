import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import { Metadata } from "next";
import InvoiceDetailPageClient from "./client";

type Props = {
    params: Promise<{ title: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    return {
        title: "Fakturagruppe",
    };
}

export default async function InvoiceDetailPage() {
    await ensureRole([Role.ADMIN]);
    return <InvoiceDetailPageClient />;
}
