import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import EventParticipationClientPage from "./client";

export const metadata = {
    title: "Administrer Påmeldinger",
};

export default async function AdminEventParticipationPage() {
    await ensureRole([Role.ADMIN]);
    return <EventParticipationClientPage />;
}
