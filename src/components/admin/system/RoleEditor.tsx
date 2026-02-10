"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/providers/ModalContext";
import { createRole, getRole, updateRole } from "@/server/actions/roles";
import Link from "next/link";

const PERMISSIONS = [
    { label: "Administrator (Full Tilgang)", path: "/admin.*", description: "Gir tilgang til absolutt alt i systemet." },
    { label: "Medlemmer", path: "/admin/users.*", description: "Se, redigere og slette medlemmer." },
    { label: "Arrangementer", path: "/admin/events.*", description: "Opprette og redigere arrangementer." },
    { label: "Innlegg & Nyheter", path: "/admin/posts.*", description: "Publisere og redigere innhold." },
    { label: "Bilder", path: "/admin/photos.*", description: "Administrere bildegallerier." },
    { label: "Økonomi", path: "/admin/finance.*", description: "Se transaksjoner, fakturaer og regnskap." },
    { label: "Systeminnstillinger", path: "/admin/system.*", description: "Endre globale innstillinger og medlemskapstyper." },
];

export default function RoleEditor({ id }: { id?: string }) {
    const router = useRouter();
    const { openAlert } = useModal();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [allowedPaths, setAllowedPaths] = useState<string[]>([]);
    const [isSystem, setIsSystem] = useState(false);

    useEffect(() => {
        if (id) {
            loadRole(id);
        }
    }, [id]);

    const loadRole = async (roleId: string) => {
        setLoading(true);
        const res = await getRole(roleId);
        if (res.success && res.role) {
            setName(res.role.name);
            setDescription(res.role.description || "");
            setAllowedPaths(res.role.allowedPaths);
            setIsSystem(res.role.isSystem);
        } else {
            await openAlert({ title: "Feil", message: "Kunne ikke laste rolle.", type: "error" });
            router.push("/admin/system/user-roles");
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const data = { name, description, allowedPaths };
        let res;

        if (id) {
            res = await updateRole(id, data);
        } else {
            res = await createRole(data);
        }

        if (res.success) {
            await openAlert({
                title: "Lagret",
                message: id ? "Rollen ble oppdatert." : "Ny rolle opprettet.",
                type: "success"
            });
            router.push("/admin/system/user-roles");
            router.refresh();
        } else {
            await openAlert({
                title: "Feil",
                message: res.error || "Noe gikk galt.",
                type: "error"
            });
            setLoading(false);
        }
    };

    const togglePermission = (path: string) => {
        setAllowedPaths(prev => {
            if (prev.includes(path)) {
                return prev.filter(p => p !== path);
            } else {
                return [...prev, path];
            }
        });
    };

    if (loading && id && !name) return <div className="p-8 text-center text-gray-500">Laster...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{id ? "Rediger Rolle" : "Ny Rolle"}</h1>
                    <p className="text-gray-500 text-sm">Angi navn, beskrivelse og tillatelser.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Rollenavn</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                            placeholder="F.eks. Redaktør"
                            // System roles should ideally not change name as logic might depend on it (e.g. Admin check in code)
                            // But we allowed it in server action. Let's warn or block if system?
                            // For safety, let's just let Admin do proper admin things.
                            disabled={isSystem && name === "Admin"}
                        />
                        {isSystem && <p className="text-xs text-amber-600 mt-1">Dette er en systemrolle. Vær forsiktig med å endre navnet.</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Beskrivelse</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                            placeholder="Hva brukes denne rollen til?"
                        />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-600">verified_user</span>
                        Tilganger
                    </h3>

                    <div className="space-y-3">
                        {PERMISSIONS.map(perm => {
                            const isChecked = allowedPaths.includes(perm.path);
                            // If user selects "Admin Full Access", basically everything else is redundant but let's just show checkboxes.
                            // Better UX: If Admin is checked, disable others? Or check all?
                            // Let's keep it simple.

                            return (
                                <label key={perm.path} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isChecked ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => togglePermission(perm.path)}
                                        className="mt-1 w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <div className="font-bold text-gray-900 text-sm">{perm.label}</div>
                                        <div className="text-gray-500 text-xs">{perm.description}</div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Link href="/admin/system/user-roles" className="px-6 py-2 rounded-lg text-gray-600 font-bold hover:bg-gray-100 transition-colors">
                        Avbryt
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-shadow shadow-sm disabled:opacity-50"
                    >
                        {loading ? "Lagrer..." : "Lagre Rolle"}
                    </button>
                </div>
            </form>
        </div>
    );
}
