import React from "react";
import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import TransactionDetailPageClient from "./client";

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await ensureRole([Role.ADMIN]);
    const { id } = await params;

    return <TransactionDetailPageClient id={id} />;
}
