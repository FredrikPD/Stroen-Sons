"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryWithCount, createCategory, updateCategory, deleteCategory, getCategories } from "@/server/actions/categories";
import { useModal } from "@/components/providers/ModalContext";
import { toast } from "sonner";
import { CATEGORY_COLORS, getCategoryColorClasses } from "@/lib/category-colors";
import { ActionInfo } from "@/components/ui/ActionInfo";
import { AdminPageHeader, SERIF, btnPrimary, btnSecondary, label, input, textarea } from "@/components/admin/ui";

interface Props {
    initialCategories: CategoryWithCount[];
}

export function CategoriesClient({ initialCategories }: Props) {
    const [categories, setCategories] = useState<CategoryWithCount[]>(initialCategories);
    const { openConfirm, openAlert } = useModal(); // Assuming ModalContext provides these
    const router = useRouter();

    // Local state for modal visibility (simple local modal for creating/editing)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
    const [formData, setFormData] = useState({ name: "", description: "", color: "blue" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOpenCreate = () => {
        setEditingCategory(null);
        setFormData({ name: "", description: "", color: "blue" });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (category: CategoryWithCount) => {
        setEditingCategory(category);
        setFormData({ name: category.name, description: category.description || "", color: category.color || "blue" });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let res;
            if (editingCategory) {
                res = await updateCategory(editingCategory.id, formData);
            } else {
                res = await createCategory(formData);
            }

            if (res.success) {
                toast.success(editingCategory ? "Kategori oppdatert" : "Kategori opprettet");
                handleCloseModal();
                // Refresh categories list
                const refreshed = await getCategories();
                if (refreshed.success && refreshed.data) setCategories(refreshed.data);
            } else {
                toast.error(res.error || "Noe gikk galt");
            }
        } catch (error) {
            toast.error("En feil oppstod");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (category: CategoryWithCount) => {
        const confirmed = await openConfirm({
            title: "Slett kategori",
            message: `Er du sikker på at du vil slette "${category.name}"?\n\nDu kan bare slette kategorier som ikke er i bruk. Er kategorien knyttet til innlegg, må du først flytte innleggene til en annen kategori. Ingen innlegg slettes.`,
            type: "warning",
            confirmText: "Slett"
        });

        if (!confirmed) return;

        try {
            const res = await deleteCategory(category.id);
            if (res.success) {
                toast.success("Kategori slettet");
                const refreshed = await getCategories();
                if (refreshed.success && refreshed.data) setCategories(refreshed.data);
            } else {
                await openAlert({
                    title: "Kan ikke slette",
                    message: res.error || "Feil ved sletting",
                    type: "error"
                });
            }
        } catch (error) {
            toast.error("En feil oppstod");
        }
    };

    return (
        <div className="space-y-6">
            <AdminPageHeader
                eyebrow="Innholdsstyring"
                title="Kategorier"
                description="Administrer kategorier for innlegg og innhold."
                actions={
                    <button onClick={handleOpenCreate} className={btnPrimary}>
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Ny Kategori
                    </button>
                }
            />

            <div className="bg-white rounded-2xl border border-border-color overflow-hidden">
                <table className="min-w-full divide-y divide-border-color">
                    <thead className="bg-[#faf8f3]">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Navn</th>
                            <th scope="col" className="px-6 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Beskrivelse</th>
                            <th scope="col" className="px-6 py-3 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">Innlegg</th>
                            <th scope="col" className="px-6 py-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">Handlinger</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-border-color">
                        {categories.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-400 italic" style={{ fontFamily: SERIF }}>
                                    Ingen kategorier funnet. Opprett en ny for å komme i gang.
                                </td>
                            </tr>
                        ) : (
                            categories.map((category) => (
                                <tr key={category.id} className="hover:bg-black/[0.02] transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${getCategoryColorClasses(category.color).dot}`} />
                                            <div className="text-sm font-medium text-gray-900">{category.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-text-secondary">{category.description || "-"}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tabular-nums ${category._count.posts > 0 ? "bg-cream text-text-secondary" : "bg-gray-100 text-gray-500"
                                            }`}>
                                            {category._count.posts}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenEdit(category)}
                                                className="text-gray-400 hover:text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors"
                                                title="Rediger"
                                            >
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category)}
                                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                                title="Slett"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={handleCloseModal}>
                    <div className="bg-white rounded-2xl border border-border-color shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-border-color flex justify-between items-center">
                            <h3 className="text-xl font-normal text-gray-900" style={{ fontFamily: SERIF }}>
                                {editingCategory ? "Rediger Kategori" : "Ny Kategori"}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {editingCategory && (
                                <ActionInfo
                                    variant="info"
                                    title="Hva skjer når du lagrer?"
                                    items={[
                                        "Endrer du navnet, blir alle innleggene som bruker denne kategorien automatisk flyttet over til det nye navnet.",
                                        "Farge og beskrivelse endrer bare hvordan kategorien vises.",
                                        "Ingen varsler sendes ut.",
                                    ]}
                                />
                            )}
                            <div>
                                <label htmlFor="name" className={label}>
                                    Navn
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    required
                                    className={input}
                                    placeholder="F.eks. Nyheter"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="description" className={label}>
                                    Beskrivelse (valgfritt)
                                </label>
                                <textarea
                                    id="description"
                                    rows={3}
                                    className={textarea}
                                    placeholder="Beskriv kategorien..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="color" className={label}>
                                    Farge
                                </label>
                                <select
                                    id="color"
                                    className={input}
                                    value={formData.color}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                >
                                    {CATEGORY_COLORS.map(color => (
                                        <option key={color.value} value={color.value}>{color.name}</option>
                                    ))}
                                </select>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${getCategoryColorClasses(formData.color).bg} ${getCategoryColorClasses(formData.color).text} ${getCategoryColorClasses(formData.color).border}`}>
                                        {formData.name || "Forhåndsvisning"}
                                    </span>
                                </div>
                            </div>
                            {!editingCategory && (
                                <ActionInfo variant="info" compact>
                                    Oppretter en ny kategori som kan brukes til å merke innlegg. Navnet må være unikt. Ingen varsler sendes ut.
                                </ActionInfo>
                            )}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className={btnSecondary}
                                >
                                    Avbryt
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={btnPrimary}
                                >
                                    {isSubmitting && (
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    )}
                                    {editingCategory ? "Lagre" : "Opprett"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
