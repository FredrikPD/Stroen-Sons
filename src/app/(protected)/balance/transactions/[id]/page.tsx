import React from "react";
import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";
import TransactionDetailClient from "./client";

export default async function UserTransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    try {
        await ensureMember();
    } catch (e) {
        redirect("/sign-in");
    }

    const { id } = await params;
    return <TransactionDetailClient id={id} />;
}
