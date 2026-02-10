"use server";

import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import RoleEditorClient from "./client";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
    await ensureRole([Role.ADMIN]);
    const { id } = await params;
    return <RoleEditorClient id={id} />;
}
