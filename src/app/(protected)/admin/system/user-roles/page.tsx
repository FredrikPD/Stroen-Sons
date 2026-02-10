"use server";

import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import RolesClientPage from "./client";

export default async function RolesPage() {
    await ensureRole([Role.ADMIN]);
    return <RolesClientPage />;
}
