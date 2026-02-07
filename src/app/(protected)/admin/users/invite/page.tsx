import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import InviteMemberForm from "./client";

export default async function InviteMemberPage() {
    await ensureRole([Role.ADMIN]);

    return (
        <InviteMemberForm />
    );
}
