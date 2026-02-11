import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import { getInvitations } from "@/server/actions/invitations";
import InvitationsClientPage from "./client";
import { SetHeader } from "@/components/layout/SetHeader";

export const metadata = {
    title: "Invitasjoner",
};

export default async function InvitationsPage() {
    await ensureRole([Role.ADMIN]);

    let invitationsData: any[] = [];
    let errorData: string | undefined = undefined;

    try {
        const { invitations, error } = await getInvitations();
        if (error) {
            errorData = error;
        } else {
            invitationsData = invitations || [];
        }
    } catch (e) {
        console.error("Error in InvitationsPage:", e);
        errorData = "En uventet feil oppstod ved lasting av siden.";
    }

    return (
        <>
            <SetHeader backHref="/admin/users" backLabel="Brukere" />
            <InvitationsClientPage
                initialInvitations={invitationsData}
                initialError={errorData}
            />
        </>
    );
}
