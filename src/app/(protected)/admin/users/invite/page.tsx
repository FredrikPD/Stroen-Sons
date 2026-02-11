import { db } from "@/server/db";
import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import InviteMemberForm from "./client";
import { SetHeader } from "@/components/layout/SetHeader";

export const metadata = {
    title: "Inviter Brukere",
};

export default async function InviteMemberPage() {
    await ensureRole([Role.ADMIN]);
    const availableRoles = await db.userRole.findMany({ orderBy: { name: 'asc' } });

    return (
        <>
            <SetHeader backHref="/admin/users" backLabel="Brukere" />
            <InviteMemberForm availableRoles={availableRoles} />
        </>
    );
}
