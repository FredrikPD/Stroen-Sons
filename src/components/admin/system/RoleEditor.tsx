"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/providers/ModalContext";
import { createRole, getRole, updateRole } from "@/server/actions/roles";
import Link from "next/link";
import { LoadingState } from "@/components/ui/LoadingState";
import { ActionInfo } from "@/components/ui/ActionInfo";
import { AdminPageHeader, btnPrimary, btnSecondary, card, label, input, textarea, SERIF } from "@/components/admin/ui";

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

    if (loading && id && !name) return <LoadingState className="h-56" />;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <AdminPageHeader
                eyebrow="System"
                title={id ? "Rediger Rolle" : "Ny Rolle"}
                description="Angi navn, beskrivelse og tillatelser."
            />

            {!id && (
                <ActionInfo
                    variant="info"
                    title="Slik fungerer en ny rolle"
                    items={[
                        "Tilgangene du huker av styrer hvilke deler av admin medlemmer med denne rollen får se og bruke.",
                        "Rollen påvirker ingen før du senere tildeler den til et medlem, og ingen varsler sendes ut.",
                        "«Administrator (Full Tilgang)» gir tilgang til alt, inkludert økonomi og sletting av medlemmer – bruk den med omhu.",
                    ]}
                />
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className={`${card} p-6 space-y-4`}>
                    <div>
                        <label className={label}>Rollenavn</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={`${input} disabled:bg-gray-50`}
                            placeholder="F.eks. Redaktør"
                            // System roles should ideally not change name as logic might depend on it (e.g. Admin check in code)
                            // But we allowed it in server action. Let's warn or block if system?
                            // For safety, let's just let Admin do proper admin things.
                            disabled={isSystem && name === "Admin"}
                        />
                        <ActionInfo variant="warning" compact>
                            Navnet styrer logikk i systemet: rollen «Admin» får automatisk full tilgang, og navnet avgjør også hvilken standardrolle nye medlemmer får. Endrer du navnet, kan tilganger slutte å fungere.
                        </ActionInfo>
                    </div>

                    <div>
                        <label className={label}>Beskrivelse</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className={`${textarea} h-24 resize-none`}
                            placeholder="Hva brukes denne rollen til?"
                        />
                    </div>
                </div>

                <div className={`${card} p-6`}>
                    <h3 className="text-xl font-normal text-gray-900 mb-4 flex items-center gap-2" style={{ fontFamily: SERIF }}>
                        <span className="material-symbols-outlined text-primary">verified_user</span>
                        Tilganger
                    </h3>

                    {id && (
                        <ActionInfo
                            variant="warning"
                            title="Endringer gjelder alle med rollen"
                            className="mb-4"
                            items={[
                                "Endringene her gjelder umiddelbart for alle medlemmer som har denne rollen, ikke bare deg.",
                                "Fjerner du en tilgang, mister alle med rollen den ved neste sidevisning.",
                                "«Administrator (Full Tilgang)» gir tilgang til absolutt alt.",
                            ]}
                        />
                    )}

                    <div className="space-y-3">
                        {PERMISSIONS.map(perm => {
                            const isChecked = allowedPaths.includes(perm.path);
                            // If user selects "Admin Full Access", basically everything else is redundant but let's just show checkboxes.
                            // Better UX: If Admin is checked, disable others? Or check all?
                            // Let's keep it simple.

                            return (
                                <label key={perm.path} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isChecked ? 'bg-primary/10 border-primary/50' : 'bg-white border-border-color hover:border-gray-300'}`}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => togglePermission(perm.path)}
                                        className="mt-1 w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary"
                                    />
                                    <div>
                                        <div className="font-semibold text-gray-900 text-sm">{perm.label}</div>
                                        <div className="text-text-secondary text-xs">{perm.description}</div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Link href="/admin/system/user-roles" className={btnSecondary}>
                        Avbryt
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className={btnPrimary}
                    >
                        {loading ? "Lagrer..." : "Lagre Rolle"}
                    </button>
                </div>
            </form>
        </div>
    );
}
