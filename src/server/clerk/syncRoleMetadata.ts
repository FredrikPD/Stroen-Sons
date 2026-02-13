import { Role } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";

type SyncRoleMetadataParams = {
    clerkId: string | null;
    roleId: string;
    legacyRole: Role;
};

type SyncRoleMetadataResult =
    | { success: true; skipped: false }
    | { success: false; skipped: true }
    | { success: false; skipped: false; error: string };

export async function syncClerkRoleMetadata({
    clerkId,
    roleId,
    legacyRole,
}: SyncRoleMetadataParams): Promise<SyncRoleMetadataResult> {
    if (!clerkId) {
        return { success: false, skipped: true };
    }

    try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(clerkId, {
            publicMetadata: {
                role: legacyRole,
                roleId,
                source: "admin_role_update",
            },
        });

        return { success: true, skipped: false };
    } catch (error) {
        console.error("Failed to sync role metadata to Clerk:", error);
        return {
            success: false,
            skipped: false,
            error: "Rollen ble oppdatert, men Clerk metadata ble ikke oppdatert.",
        };
    }
}
