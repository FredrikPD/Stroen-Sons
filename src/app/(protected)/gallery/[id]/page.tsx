import { getAlbumWithPhotos } from "../actions";
import { notFound, redirect } from "next/navigation";
import AlbumPhotosView from "@/components/gallery/AlbumPhotosView";
import { Metadata } from "next";
import { ensureMember } from "@/server/auth/ensureMember";

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    const album = await getAlbumWithPhotos(id);

    return {
        title: album ? `${album.title} | Bildearkiv` : "Album | Strøen Søns",
    };
}

export default async function AlbumPage({ params }: Props) {
    const { id } = await params;
    const member = await ensureMember();
    if (!member) {
        redirect("/sign-in");
    }

    const album = await getAlbumWithPhotos(id);

    if (!album) {
        notFound();
    }

    return <AlbumPhotosView album={album} />;
}
