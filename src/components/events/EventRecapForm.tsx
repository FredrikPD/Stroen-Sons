"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { eventRecapSchema, EventRecapInput } from "@/lib/validators/event-recaps";

type RecapGameFormInput = {
    gameType: string;
    title: string;
    opponent: string;
    ourScore: string;
    theirScore: string;
    winner: "" | "TEAM_A" | "TEAM_B" | "DRAW";
};

type EventRecapFormInput = {
    status: "DRAFT" | "PUBLISHED";
    summaryPointsText: string;
    story: string;
    lessons: string;
    games: RecapGameFormInput[];
};

interface EventRecapFormProps {
    eventId: string;
    initialData?: Partial<EventRecapInput>;
    onSubmit: (data: EventRecapInput) => Promise<{ success: boolean; error?: string }>;
    redirectOnSuccess?: string;
    formId?: string;
}

const parseLineList = (value: string) =>
    value
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

const toOptionalNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) return undefined;
    return parsed;
};

const getWinnerFromResult = (result?: "WIN" | "DRAW" | "LOSS") => {
    if (result === "WIN") return "TEAM_A";
    if (result === "LOSS") return "TEAM_B";
    if (result === "DRAW") return "DRAW";
    return "";
};

const getResultFromWinner = (winner: "" | "TEAM_A" | "TEAM_B" | "DRAW") => {
    if (winner === "TEAM_A") return "WIN" as const;
    if (winner === "TEAM_B") return "LOSS" as const;
    if (winner === "DRAW") return "DRAW" as const;
    return undefined;
};

export function EventRecapForm({
    eventId,
    initialData,
    onSubmit,
    redirectOnSuccess,
    formId = "event-recap-form",
}: EventRecapFormProps) {
    const router = useRouter();
    const [previewStory, setPreviewStory] = useState(false);

    const {
        register,
        control,
        handleSubmit,
    } = useForm<EventRecapFormInput>({
        defaultValues: {
            status: initialData?.status || "DRAFT",
            summaryPointsText: initialData?.summaryPoints?.join("\n") || "",
            story: initialData?.story || "",
            lessons: initialData?.lessons || "",
            games: initialData?.games?.map((game) => ({
                gameType: game.notes || "",
                title: game.title,
                opponent: game.opponent || "",
                ourScore: game.ourScore?.toString() || "",
                theirScore: game.theirScore?.toString() || "",
                winner: getWinnerFromResult(game.result),
            })) || [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "games",
    });

    const story = useWatch({
        control,
        name: "story",
    });

    const submitForm = handleSubmit(async (values) => {
        const payload: EventRecapInput = {
            status: values.status,
            summaryPoints: parseLineList(values.summaryPointsText),
            story: values.story.trim() || undefined,
            lessons: values.lessons.trim() || undefined,
            games: values.games
                .map((game) => ({
                    notes: game.gameType.trim() || undefined,
                    title: game.title.trim(),
                    opponent: game.opponent.trim(),
                    ourScore: toOptionalNumber(game.ourScore),
                    theirScore: toOptionalNumber(game.theirScore),
                    result: getResultFromWinner(game.winner),
                }))
                .filter((game) => Boolean(game.title && game.opponent)),
        };

        const parsed = eventRecapSchema.safeParse(payload);
        if (!parsed.success) {
            toast.error(parsed.error.issues[0]?.message || "Sjekk feltene i etterrapporten");
            return;
        }

        const result = await onSubmit(parsed.data);
        if (!result.success) {
            toast.error(result.error || "Kunne ikke lagre etterrapport");
            return;
        }

        toast.success("Etterrapport lagret");
        if (redirectOnSuccess) {
            router.push(redirectOnSuccess);
            return;
        }
        router.push(`/events/${eventId}`);
        router.refresh();
    });

    return (
        <form id={formId} onSubmit={submitForm} className="space-y-6 pb-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <h3 className="text-base font-bold text-gray-900">Kort oppsummert</h3>
                        <p className="text-xs text-gray-500">
                            Ett punkt per linje.
                        </p>
                        <textarea
                            {...register("summaryPointsText")}
                            rows={5}
                            placeholder={"Fantastisk laginnsats\nSterk defensiv i finalen\nGod stemning blant alle"}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                        />
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900">Hva skjedde</h3>
                            <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
                                <button
                                    type="button"
                                    onClick={() => setPreviewStory(false)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded ${!previewStory ? "bg-[#4F46E5] text-white" : "text-gray-500 hover:bg-gray-100"}`}
                                >
                                    Rediger
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewStory(true)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded ${previewStory ? "bg-[#4F46E5] text-white" : "text-gray-500 hover:bg-gray-100"}`}
                                >
                                    Forhåndsvisning
                                </button>
                            </div>
                        </div>
                        {!previewStory ? (
                            <textarea
                                {...register("story")}
                                rows={10}
                                placeholder="Skriv historien fra arrangementet..."
                                className="w-full rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                            />
                        ) : (
                            <div className="min-h-[220px] rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-3 prose prose-sm max-w-none text-gray-700">
                                {story?.trim() ? <ReactMarkdown>{story}</ReactMarkdown> : <p>Ingen tekst enda.</p>}
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900">Kamper</h3>
                            <button
                                type="button"
                                onClick={() => append({
                                    gameType: "",
                                    title: "",
                                    opponent: "",
                                    ourScore: "",
                                    theirScore: "",
                                    winner: "",
                                })}
                                className="px-3 py-2 rounded-lg bg-[#EEF2FF] text-[#4F46E5] text-xs font-bold hover:bg-[#e4e9ff]"
                            >
                                + Legg til kamp
                            </button>
                        </div>

                        {fields.length === 0 ? (
                            <p className="text-xs text-gray-500">Ingen kamper registrert enda.</p>
                        ) : (
                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="rounded-xl border border-gray-200 p-4 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <input
                                                {...register(`games.${index}.gameType`)}
                                                placeholder="Spilltype"
                                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#4F46E5]"
                                            />
                                            <input
                                                {...register(`games.${index}.title`)}
                                                placeholder="Lag 1 *"
                                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#4F46E5]"
                                            />
                                            <input
                                                {...register(`games.${index}.opponent`)}
                                                placeholder="Lag 2 *"
                                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#4F46E5]"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <input
                                                type="number"
                                                min={0}
                                                {...register(`games.${index}.ourScore`)}
                                                placeholder="Score lag 1"
                                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#4F46E5]"
                                            />
                                            <input
                                                type="number"
                                                min={0}
                                                {...register(`games.${index}.theirScore`)}
                                                placeholder="Score lag 2"
                                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#4F46E5]"
                                            />
                                            <select
                                                {...register(`games.${index}.winner`)}
                                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#4F46E5]"
                                            >
                                                <option value="">Hvem vant?</option>
                                                <option value="TEAM_A">Lag 1 vant</option>
                                                <option value="TEAM_B">Lag 2 vant</option>
                                                <option value="DRAW">Uavgjort</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                className="rounded-lg border border-red-200 text-red-600 hover:bg-red-50 px-3 py-2 text-sm font-semibold"
                                            >
                                                Fjern
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <h3 className="text-base font-bold text-gray-900">Publisering</h3>
                        <select
                            {...register("status")}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                        >
                            <option value="DRAFT">Utkast</option>
                            <option value="PUBLISHED">Publisert</option>
                        </select>
                        <p className="text-xs text-gray-500">
                            Utkast vises kun for admin/moderator. Publisert vises for alle.
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <h3 className="text-base font-bold text-gray-900">Lærdom og neste gang</h3>
                        <textarea
                            {...register("lessons")}
                            rows={7}
                            placeholder="Hva lærte vi, og hva gjør vi neste gang?"
                            className="w-full rounded-xl border border-gray-200 bg-gray-50/40 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                        />
                    </div>
                </div>
            </div>
        </form>
    );
}
