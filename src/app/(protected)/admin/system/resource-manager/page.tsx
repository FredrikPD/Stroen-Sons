
import ResourceManagerClient from "./ResourceManagerClient";

export const metadata = {
    title: "Ressursstyring",
};

import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";

export default async function ResourceManagerPage() {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);
    return <ResourceManagerClient />;
}
