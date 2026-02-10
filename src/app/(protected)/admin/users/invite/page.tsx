import { db } from "@/server/db";
import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import InviteMemberForm from "./client";

export const metadata = {
    title: "Inviter Brukere",
};

export default async function InviteMemberPage() {
    await ensureRole([Role.ADMIN]);
    const availableRoles = await db.userRole.findMany({ orderBy: { name: 'asc' } });

    return (
        <InviteMemberForm availableRoles={availableRoles} />
    );
}
