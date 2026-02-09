import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import { getPhotoSettings } from "@/server/actions/settings";
import PhotoSettingsClient from "./client";

export const metadata = {
    title: "Bildeinnstillinger",
};

export default async function PhotoSettingsPage() {
    await ensureRole([Role.ADMIN]);

    const settings = await getPhotoSettings();

    return (
        <PhotoSettingsClient
            initialMaxSize={settings.maxSizeMB}
            initialMaxFiles={settings.maxFiles}
        />
    );
}
