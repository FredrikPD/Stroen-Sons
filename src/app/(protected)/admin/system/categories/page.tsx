
import { getCategories } from "@/server/actions/categories";
import { CategoriesClient } from "./CategoriesClient";

export const metadata = {
    title: "Kategorier",
};

import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";

export default async function CategoriesPage() {
    await ensureRole([Role.ADMIN, Role.MODERATOR]);
    const { data } = await getCategories();

    return (
        <CategoriesClient initialCategories={data || []} />
    );
}
