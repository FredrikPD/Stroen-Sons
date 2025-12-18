import { getRecentEvents, getRecentPhotos } from "@/actions/admin-photos";
import { PhotoManager } from "@/components/admin/photo-manager";

interface PageProps {
    searchParams: Promise<{ eventId?: string }>;
}

export default async function AdminPhotosPage(props: PageProps) {
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
