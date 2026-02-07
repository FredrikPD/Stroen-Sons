import { getRecentEvents, getRecentPhotos } from "@/actions/admin-photos";
import { PhotoManager } from "@/components/admin/photo-manager";

interface PageProps {
    searchParams: Promise<{ eventId?: string }>;
}

import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";

export default async function AdminPhotosPage(props: PageProps) {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);
    const searchParams = await props.searchParams;
    const eventId = searchParams.eventId;

    const [events, photos] = await Promise.all([
        getRecentEvents(),
        getRecentPhotos(eventId),
    ]);

    return (
        <div className="space-y-6">
            <PhotoManager initialEvents={events} initialPhotos={photos} />
        </div>
    );
}
