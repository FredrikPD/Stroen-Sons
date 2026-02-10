"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EventCategoryWithCount, createEventCategory, updateEventCategory, deleteEventCategory, getEventCategories } from "@/server/actions/event-categories";
import { useModal } from "@/components/providers/ModalContext";
import { toast } from "sonner";
import { CATEGORY_COLORS, getCategoryColorClasses } from "@/lib/category-colors";

interface Props {
    initialCategories: EventCategoryWithCount[];
}

export function EventCategoriesClient({ initialCategories }: Props) {
    const [categories, setCategories] = useState<EventCategoryWithCount[]>(initialCategories);
    const { openConfirm, openAlert } = useModal();
    const router = useRouter();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<EventCategoryWithCount | null>(null);
    const [formData, setFormData] = useState({ name: "", description: "", color: "blue" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleOpenCreate = () => {
        setEditingCategory(null);
        setFormData({ name: "", description: "", color: "blue" });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (category: EventCategoryWithCount) => {
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
                res = await updateEventCategory(editingCategory.id, formData);
            } else {
                res = await createEventCategory(formData);
            }

            if (res.success) {
                toast.success(editingCategory ? "Kategori oppdatert" : "Kategori opprettet");
                handleCloseModal();
                const refreshed = await getEventCategories();
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

    const handleDelete = async (category: EventCategoryWithCount) => {
        const confirmed = await openConfirm({
            title: "Slett kategori",
            message: `Er du sikker på at du vil slette "${category.name}"?`,
            type: "warning",
            confirmText: "Slett"
        });

        if (!confirmed) return;

        try {
            const res = await deleteEventCategory(category.id);
            if (res.success) {
                toast.success("Kategori slettet");
                const refreshed = await getEventCategories();
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Arrangementskategorier</h1>
                    <p className="text-gray-500">Administrer kategorier for arrangementer og aktiviteter.</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Ny Kategori
                </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Navn</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Beskrivelse</th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Arrangementer</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Handlinger</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {categories.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    Ingen kategorier funnet. Opprett en ny for å komme i gang.
                                </td>
                            </tr>
                        ) : (
                            categories.map((category) => (
                                <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${getCategoryColorClasses(category.color).dot}`} />
                                            <div className="text-sm font-medium text-gray-900">{category.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-500">{category.description || "-"}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${category._count.events > 0 ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"
                                            }`}>
                                            {category._count.events}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenEdit(category)}
                                                className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded transition-colors"
                                                title="Rediger"
                                            >
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category)}
                                                className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleCloseModal}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingCategory ? "Rediger Kategori" : "Ny Kategori"}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                    Navn
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    required
                                    className="block w-full rounded-lg border-gray-300 border bg-gray-50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    placeholder="F.eks. Fest"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                    Beskrivelse (valgfritt)
                                </label>
                                <textarea
                                    id="description"
                                    rows={3}
                                    className="block w-full rounded-lg border-gray-300 border bg-gray-50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    placeholder="Beskriv kategorien..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                                    Farge
                                </label>
                                <select
                                    id="color"
                                    className="block w-full rounded-lg border-gray-300 border bg-gray-50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
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
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                >
                                    Avbryt
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isSubmitting && (
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
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
