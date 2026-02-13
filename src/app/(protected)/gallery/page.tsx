import { getAlbums } from "./actions";
import GalleryView from "@/components/gallery/GalleryView";
import { ensureMember } from "@/server/auth/ensureMember";

export const metadata = {
    title: "Bildegalleri",
};

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
    await ensureMember();
    const albums = await getAlbums();

    return <GalleryView albums={albums} />;
}
