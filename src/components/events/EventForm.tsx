"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventSchema, EventInput } from "@/lib/validators/events";
import { useUploadThing } from "@/utils/uploadthing";
import { toast } from "sonner";
import { format } from "date-fns";

interface EventFormProps {
    initialData?: Partial<EventInput> & { id?: string };
    onSubmit: (data: EventInput) => Promise<{ success: boolean; error?: string }>;
    submitButtonText: string;
    isEditMode?: boolean;
}

// Form input type where startAt is a string for the input field
type EventFormInput = Omit<EventInput, "startAt"> & { startAt: string };

export function EventForm({ initialData, onSubmit, submitButtonText, isEditMode = false }: EventFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedCoverImage, setUploadedCoverImage] = useState<string | null>(initialData?.coverImage || null);

    const { startUpload, isUploading } = useUploadThing("coverImage");

    // Helper to format date for datetime-local input
    const formatDateForInput = (date?: Date | string) => {
        if (!date) return "";
        const d = new Date(date);
        return format(d, "yyyy-MM-dd'T'HH:mm");
    };

    // Sync state with initialData if it changes
    useEffect(() => {
        console.log("Syncing from initialData:", initialData?.coverImage);
        if (initialData?.coverImage) {
            setUploadedCoverImage(initialData.coverImage);
        }
    }, [initialData?.coverImage]);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
    } = useForm<EventFormInput>({
        resolver: zodResolver(eventSchema) as any,
        defaultValues: {
            title: initialData?.title || "",
            description: initialData?.description || "",
            startAt: initialData?.startAt ? formatDateForInput(initialData.startAt) : "",
            location: initialData?.location || "",
            address: initialData?.address || "",
            totalCost: initialData?.totalCost || 0,
            clubSubsidy: initialData?.clubSubsidy || 0,
            program: initialData?.program || [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "program",
    });

    const handleFormSubmit = async (data: EventFormInput) => {
        setIsSubmitting(true);
        try {
            // Convert the string date back to a Date object
            const formData: EventInput = {
                ...data,
                startAt: new Date(data.startAt),
                coverImage: uploadedCoverImage || undefined,
            };

            const result = await onSubmit(formData);

            if (result.success) {
                toast.success(isEditMode ? "Arrangement oppdatert!" : "Arrangement opprettet!");
            } else {
                toast.error(result.error || "Noe gikk galt");
            }
        } catch (error) {
            toast.error("En feil oppstod");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Event Details Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-6 h-full">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#4F46E5]">article</span>
                            Generell Informasjon
                        </h2>

                        <div className="flex-1 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tittel *</label>
                                <input
                                    {...register("title")}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none text-gray-900 placeholder:text-gray-400"
                                    placeholder="Eks: Sommerfest 2025"
                                />
                                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                            </div>

                            <div className="flex-1 flex flex-col">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Beskrivelse</label>
                                <div className="flex-1 flex flex-col gap-2">
                                    {/* Markdown Toolbar */}
                                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200 w-fit">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const textarea = document.getElementById('description-input') as HTMLTextAreaElement;
                                                if (!textarea) return;
                                                const start = textarea.selectionStart;
                                                const end = textarea.selectionEnd;
                                                const text = textarea.value;
                                                const before = text.substring(0, start);
                                                const selection = text.substring(start, end);
                                                const after = text.substring(end);

                                                // Toggle bold
                                                const newText = `${before}**${selection || 'fet tekst'}**${after}`;

                                                // We need to use valid form setter, but since we use register we can also just trigger input event or use setValue
                                                // Ideally use setValue if we had it exposed easily or just rely on react-hook-form managing the ref
                                                // Let's use the native setter + event dispatch to ensure hook form picks it up
                                                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                                                nativeInputValueSetter?.call(textarea, newText);
                                                textarea.dispatchEvent(new Event('input', { bubbles: true }));

                                                textarea.focus();
                                                textarea.setSelectionRange(start + 2, end + 2);
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
                                            title="Fet tekst"
                                        >
                                            <span className="material-symbols-outlined text-lg">format_bold</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const textarea = document.getElementById('description-input') as HTMLTextAreaElement;
                                                if (!textarea) return;
                                                const start = textarea.selectionStart;
                                                const end = textarea.selectionEnd;
                                                const text = textarea.value;
                                                const before = text.substring(0, start);
                                                const selection = text.substring(start, end);
                                                const after = text.substring(end);

                                                const newText = `${before}*${selection || 'kursiv'}*${after}`;

                                                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                                                nativeInputValueSetter?.call(textarea, newText);
                                                textarea.dispatchEvent(new Event('input', { bubbles: true }));

                                                textarea.focus();
                                                textarea.setSelectionRange(start + 1, end + 1);
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
                                            title="Kursiv"
                                        >
                                            <span className="material-symbols-outlined text-lg">format_italic</span>
                                        </button>
                                        <div className="w-px h-4 bg-gray-300 mx-1"></div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const textarea = document.getElementById('description-input') as HTMLTextAreaElement;
                                                if (!textarea) return;
                                                const start = textarea.selectionStart;
                                                const end = textarea.selectionEnd;
                                                const text = textarea.value;
                                                const before = text.substring(0, start);
                                                const selection = text.substring(start, end);
                                                const after = text.substring(end);

                                                // For list, check if we are at start of line? simpler: just insert
                                                const newText = `${before}\n- ${selection || 'listepunkt'}${after}`;

                                                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                                                nativeInputValueSetter?.call(textarea, newText);
                                                textarea.dispatchEvent(new Event('input', { bubbles: true }));

                                                textarea.focus();
                                                textarea.setSelectionRange(start + 3, end + 3);
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
                                            title="Punktliste"
                                        >
                                            <span className="material-symbols-outlined text-lg">format_list_bulleted</span>
                                        </button>
                                    </div>

                                    <textarea
                                        id="description-input"
                                        {...register("description")}
                                        rows={12}
                                        className="w-full flex-1 min-h-[400px] px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none text-gray-900 placeholder:text-gray-400 resize-none font-mono text-sm leading-relaxed"
                                        placeholder="Beskriv arrangementet... (Støtter Markdown)"
                                    />
                                    <p className="text-xs text-gray-400">
                                        Tips: Du kan bruke Markdown for formatering. **Fet**, *Kursiv*, - Liste.<br />
                                        For å få ny linje, trykk <strong>Enter to ganger</strong>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>


                {/* Right Column - Media & Economics */}
                <div className="space-y-6">
                    {/* Cover Image */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#4F46E5]">image</span>
                            Coverbilde
                        </h2>

                        {uploadedCoverImage ? (
                            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-gray-100 group">
                                <img
                                    src={uploadedCoverImage}
                                    alt="Cover"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setUploadedCoverImage(null)}
                                        className="bg-white/90 text-red-500 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-white"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                        Fjern
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors h-48 flex flex-col items-center justify-center gap-4 cursor-pointer relative">
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        try {
                                            const res = await startUpload([file]);
                                            console.log("Upload result:", res);
                                            // Handle both possible response formats (custom array or standard array)
                                            const uploadedFile = res && Array.isArray(res) ? res[0] : null;
                                            const fileUrl = uploadedFile?.url || uploadedFile?.serverData?.url;

                                            if (fileUrl) {
                                                setUploadedCoverImage(fileUrl);
                                                toast.success("Bilde lastet opp!");
                                            } else {
                                                console.error("No URL found in response", res);
                                                toast.error("Kunne ikke hente bilde-URL");
                                            }
                                        } catch (error: any) {
                                            console.error("Upload failed:", error);
                                            toast.error("Feil ved opplasting: " + (error.message || "Ukjent feil"));
                                        }
                                    }}
                                />
                                <div className="w-12 h-12 rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-[#4F46E5]">
                                    <span className="material-symbols-outlined">upload</span>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-gray-700">Last opp coverbilde</p>
                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG opp til 4MB</p>
                                </div>
                                {isUploading && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="w-6 h-6 border-2 border-[#4F46E5]/30 border-t-[#4F46E5] rounded-full animate-spin" />
                                            <span className="text-xs font-semibold text-[#4F46E5]">Laster opp...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Location & Time Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#4F46E5]">location_on</span>
                            Tid og Sted
                        </h2>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Starttidspunkt *</label>
                                <input
                                    type="datetime-local"
                                    {...register("startAt")}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none text-gray-900"
                                />
                                {errors.startAt && <p className="text-red-500 text-xs mt-1">{errors.startAt.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Stednavn</label>
                                <input
                                    {...register("location")}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none text-gray-900 placeholder:text-gray-400"
                                    placeholder="Eks: Klubbhuset"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse</label>
                                <input
                                    {...register("address")}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none text-gray-900 placeholder:text-gray-400"
                                    placeholder="Gateadresse 123, 0000 Sted"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Economics */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#4F46E5]">payments</span>
                            Økonomi
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Totalkostnad (per pers)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        {...register("totalCost")}
                                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none text-gray-900"
                                        min="0"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kr</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Klubbstøtte (per pers)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        {...register("clubSubsidy")}
                                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none text-gray-900"
                                        min="0"
                                    />
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kr</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Program / Schedule - Full Width */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#4F46E5]">event_note</span>
                                Program
                            </h2>
                            <button
                                type="button"
                                onClick={() => append({ time: "", title: "", description: "" })}
                                className="text-sm font-bold text-[#4F46E5] hover:text-[#4338ca] flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                                Legg til punkt
                            </button>
                        </div>

                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-4 items-start bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                                    <div className="w-32 flex-shrink-0">
                                        <input
                                            {...register(`program.${index}.time` as const)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#4F46E5] outline-none text-sm"
                                            placeholder="00:00"
                                        />
                                        {errors.program?.[index]?.time && (
                                            <p className="text-red-500 text-xs mt-1">{errors.program[index]?.time?.message}</p>
                                        )}
                                    </div>
                                    <div className="flex-grow space-y-2">
                                        <input
                                            {...register(`program.${index}.title` as const)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#4F46E5] outline-none text-sm font-semibold"
                                            placeholder="Hva skjer?"
                                        />
                                        {errors.program?.[index]?.title && (
                                            <p className="text-red-500 text-xs mt-1">{errors.program[index]?.title?.message}</p>
                                        )}
                                        <input
                                            {...register(`program.${index}.description` as const)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#4F46E5] outline-none text-sm text-gray-500 placeholder:text-gray-400"
                                            placeholder="Kort beskrivelse (valgfritt)"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            ))}
                            {fields.length === 0 && (
                                <p className="text-center text-gray-400 text-sm py-8">Ingen programpunkter lagt til enda.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Submit */}
            <div className="flex justify-end pt-6 border-t border-gray-100">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#4F46E5] hover:bg-[#4338ca] text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            {isEditMode ? "Oppdaterer..." : "Oppretter..."}
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">{isEditMode ? "save" : "add_circle"}</span>
                            {submitButtonText}
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
