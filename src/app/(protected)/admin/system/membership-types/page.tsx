import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import MembershipTypesClient from "./client";
import { getMembershipTypes, seedDefaultTypes } from "@/server/actions/membership-types";

export default async function MembershipTypesPage() {
    await ensureRole([Role.ADMIN]);

    const { data: types } = await getMembershipTypes();

    // Auto-seed if empty (optional convenience)
    if (!types || types.length === 0) {
        await seedDefaultTypes(false);
        // re-fetch
        const { data: seededTypes } = await getMembershipTypes();
        return <MembershipTypesClient initialTypes={seededTypes || []} />;
    }

    return <MembershipTypesClient initialTypes={types || []} />;
}
