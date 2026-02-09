import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";
import NewPostClientPage from "./client";

export const metadata = {
    title: "Nytt Innlegg",
};

import { prisma } from "@/server/db";

export default async function NewPostPage() {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);

    const categories = await prisma.category.findMany({
        orderBy: { name: "asc" }
    });

    return <NewPostClientPage categories={categories} />;
}
