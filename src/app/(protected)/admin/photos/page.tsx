import { getRecentEvents, getRecentPhotos } from "@/actions/admin-photos";
import Link from "next/link";
import { PhotoManager } from "@/components/admin/photo-manager";
import { SetHeader } from "@/components/layout/SetHeader";

interface PageProps {
    searchParams: Promise<{ eventId?: string }>;
}

import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";

import { getPhotoSettings } from "@/server/actions/settings";

export const metadata = {
    title: "Administrer Bilder",
};

export default async function AdminPhotosPage(props: PageProps) {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);
    const searchParams = await props.searchParams;
    const eventId = searchParams.eventId;

    const [events, photos, settings] = await Promise.all([
        getRecentEvents(),
        getRecentPhotos(eventId),
        getPhotoSettings(),
    ]);

    return (
        <div className="space-y-6">
            <SetHeader backHref="/admin/dashboard" backLabel="Dashboard" />
            <PhotoManager initialEvents={events} initialPhotos={photos} settings={settings} />
        </div>
    );
}
