"use server";

import { getAlbums } from "./actions";
import GalleryView from "@/components/gallery/GalleryView";

export default async function GalleryPage() {
    const albums = await getAlbums();

    return <GalleryView albums={albums} />;
}
