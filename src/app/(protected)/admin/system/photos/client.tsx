"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSystemSetting } from "@/server/actions/settings";
import { useModal } from "@/components/providers/ModalContext";

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
            <div className="flex items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bildeinnstillinger</h1>
                    <p className="text-gray-500 text-sm">Administrer begrensninger for bildeopplasting.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 max-w-2xl">

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
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <span className="font-mono font-bold text-lg w-16 text-right">{maxSize} MB</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                        <span>1 MB</span>
                        <span>16 MB</span>
                        <span>32 MB</span>
                    </div>
                </div>

                <hr className="border-gray-100" />

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
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isPending && <span className="w-4 h-4 border-2 border-[#4F46E5]/25 border-t-[#4F46E5] rounded-full animate-spin" />}
                        {isPending ? "Lagrer..." : "Lagre endringer"}
                    </button>
                </div>

            </div>
        </div>
    );
}
