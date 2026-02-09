
import { getCategories } from "@/server/actions/categories";
import { CategoriesClient } from "./CategoriesClient";

export const metadata = {
    title: "Kategorier",
};

export default async function CategoriesPage() {
    const { data } = await getCategories();

    return (
        <CategoriesClient initialCategories={data || []} />
    );
}
