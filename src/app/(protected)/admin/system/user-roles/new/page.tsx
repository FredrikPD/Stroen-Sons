"use server";

import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import RoleEditorClient from "./client";

export default async function NewRolePage() {
    await ensureRole([Role.ADMIN]);
    return <RoleEditorClient />;
}
