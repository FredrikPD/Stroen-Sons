import { getAlbums } from "./actions";
import GalleryView from "@/components/gallery/GalleryView";
import { ensureMember } from "@/server/auth/ensureMember";

export const metadata = {
    title: "Bildegalleri",
};

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
    const member = await ensureMember();
    const albums = await getAlbums();
    const isEditor = member?.role === "ADMIN" || member?.role === "MODERATOR";

    return <GalleryView albums={albums} isEditor={isEditor} />;
}
