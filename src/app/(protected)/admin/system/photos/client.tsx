"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSystemSetting } from "@/server/actions/settings";
import { useModal } from "@/components/providers/ModalContext";
import { ActionInfo } from "@/components/ui/ActionInfo";
import { AdminPageHeader, card, input, btnPrimary } from "@/components/admin/ui";

interface Props {
    initialMaxSize: number;
    initialMaxFiles: number;
}

export default function PhotoSettingsClient({ initialMaxSize, initialMaxFiles }: Props) {
    const router = useRouter();
    const { openAlert } = useModal();
    const [isPending, startTransition] = useTransition();

    const [maxSize, setMaxSize] = useState(initialMaxSize);
    const [maxFiles, setMaxFiles] = useState(initialMaxFiles);

    const handleSave = async () => {
        startTransition(async () => {
            const res1 = await updateSystemSetting("PHOTO_MAX_SIZE_MB", maxSize.toString());
            const res2 = await updateSystemSetting("PHOTO_MAX_FILES", maxFiles.toString());

            if (res1.success && res2.success) {
                await openAlert({
                    title: "Lagret",
                    message: "Bildeinnstillinger er oppdatert.",
                    type: "success"
                });
                router.refresh();
            } else {
                await openAlert({
                    title: "Feil",
                    message: "Kunne ikke lagre endringer.",
                    type: "error"
                });
            }
        });
    };

    return (
        <div className="space-y-6">
            <AdminPageHeader
                eyebrow="Systemverktøy"
                title="Bildeinnstillinger"
                description="Administrer begrensninger for bildeopplasting."
            />

            <div className={`${card} p-6 space-y-6 max-w-2xl`}>

                <ActionInfo variant="info">
                    Når du lagrer, oppdateres grensene for alle medlemmer med én gang. Det gjelder kun nye opplastinger – bilder som allerede er lastet opp, påvirkes ikke. Du kan når som helst endre verdiene tilbake.
                </ActionInfo>

                {/* Max File Size */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        Maksimal filstørrelse (MB)
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                        Hvor store enkeltfiler som kan lastes opp. Opptil 32MB støttes av server.
                    </p>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="1"
                            max="32"
                            step="1"
                            value={maxSize}
                            onChange={(e) => setMaxSize(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <span className="font-mono font-bold text-lg w-16 text-right tabular-nums">{maxSize} MB</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                        <span>1 MB</span>
                        <span>16 MB</span>
                        <span>32 MB</span>
                    </div>
                </div>

                <hr className="border-border-color" />

                {/* Max File Count */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        Maksimalt antall bilder
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                        Hvor mange bilder som kan lastes opp samtidig i én operasjon.
                    </p>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={maxFiles}
                        onChange={(e) => setMaxFiles(parseInt(e.target.value))}
                        className={`${input} tabular-nums`}
                    />
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isPending}
                        className={btnPrimary}
                    >
                        {isPending && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {isPending ? "Lagrer..." : "Lagre endringer"}
                    </button>
                </div>

            </div>
        </div>
    );
}
