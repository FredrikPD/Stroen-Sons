"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { useModal } from "@/components/providers/ModalContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { eventSchema, EventInput } from "@/lib/validators/events";
import { useUploadThing } from "@/utils/uploadthing";
import { toast } from "sonner";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

interface EventFormProps {
    initialData?: Partial<EventInput> & { id?: string };
    onSubmit: (data: EventInput) => Promise<{ success: boolean; error?: string }>;
    submitButtonText: string;
    isEditMode?: boolean;
    onSuccess?: () => void;
    redirectOnSuccess?: string;
    categories?: { id: string; name: string; color: string }[];
}

// Form input type where startAt is a string for the input field
// Form input type where dates are strings for input fields
type EventFormInput = Omit<EventInput, "startAt" | "endAt" | "registrationDeadline" | "program"> & {
    startAt: string;
    endAt: string;
    registrationDeadline: string;
    program?: {
        time: string;
        date: string;
        title: string;
        description?: string;
    }[];
    isTba?: boolean;
    isSameDay?: boolean;
    category?: string;
};

export function EventForm({ initialData, onSubmit, submitButtonText, isEditMode = false, onSuccess, redirectOnSuccess, categories = [] }: EventFormProps) {
    const { openAlert } = useModal();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedCoverImage, setUploadedCoverImage] = useState<string | null>(initialData?.coverImage || null);
    const [previewMode, setPreviewMode] = useState(false);

    const { startUpload, isUploading } = useUploadThing("coverImage");

    // Helper to format date for datetime-local input
    const formatDateForInput = (date?: Date | string) => {
        if (!date) return "";
        const d = new Date(date);
        return format(d, "yyyy-MM-dd'T'HH:mm");
    };



    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        getValues,
        formState: { errors },
    } = useForm<EventFormInput>({
        resolver: zodResolver(eventSchema) as any,
        defaultValues: {
            title: initialData?.title || "",
            description: initialData?.description || "",
            category: initialData?.category || "",
            startAt: initialData?.startAt ? formatDateForInput(initialData.startAt) : "",
            endAt: initialData?.endAt ? formatDateForInput(initialData.endAt) : "",
            registrationDeadline: initialData?.registrationDeadline ? formatDateForInput(initialData.registrationDeadline) : "",
            maxAttendees: initialData?.maxAttendees || undefined,
            location: initialData?.location || "",
            address: initialData?.address || "",
            totalCost: initialData?.totalCost || 0,

            clubSubsidy: initialData?.clubSubsidy || 0,
            coverImage: initialData?.coverImage || "",
            isTba: initialData?.isTba || false,
            isSameDay: !initialData?.endAt,
            program: initialData?.program?.map(p => ({
                ...p,
                date: p.date ? formatDateForInput(p.date) : "",
            })) || [],
        },
    });

    // Sync state with initialData if it changes
    useEffect(() => {
        if (initialData?.coverImage) {
            setUploadedCoverImage(initialData.coverImage);
            setValue("coverImage", initialData.coverImage);
        }
    }, [initialData?.coverImage, setValue]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "program",
    });

    const isTba = watch("isTba");

    useEffect(() => {
        if (isTba) {
            setValue("location", "");
            setValue("address", "");
        }
    }, [isTba, setValue]);

    const isSameDay = watch("isSameDay");
    const startAt = watch("startAt");

    useEffect(() => {
        if (isSameDay) {
            setValue("endAt", ""); // Clear end date

            // Sync program dates if startAt is set
            if (startAt) {
                const startDate = startAt.split("T")[0];
                const currentProgram = getValues("program") || [];
                const updatedProgram = currentProgram.map(p => ({ ...p, date: startDate }));
                setValue("program", updatedProgram);
            }
        }
    }, [isSameDay, startAt, setValue, getValues]);

    const handleFormSubmit = async (data: EventFormInput) => {
        setIsSubmitting(true);
        try {
            // Convert the string date back to a Date object
            const formData: EventInput = {
                ...data,
                startAt: new Date(data.startAt),
                endAt: data.endAt ? new Date(data.endAt) : undefined,
                registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : undefined,
                maxAttendees: data.maxAttendees || undefined,

                program: data.program?.map(p => ({
                    ...p,
                    date: p.date ? new Date(p.date) : undefined,
                })),
                isTba: data.isTba,
            };

            const result = await onSubmit(formData);

            if (result.success) {
                await openAlert({
                    title: isEditMode ? "Arrangement oppdatert" : "Arrangement opprettet",
                    message: isEditMode ? "Endringene dine er lagret." : "Arrangementet er nå tilgjengelig i kalenderen.",
                    type: "success",
                    confirmText: "OK"
                });

                if (redirectOnSuccess) {
                    router.push(redirectOnSuccess);
                } else if (onSuccess) {
                    onSuccess();
                } else {
                    router.refresh();
                }
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
            <input type="hidden" {...register("coverImage")} />
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

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kategori</label>
                                <select
                                    {...register("category")}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none text-gray-900"
                                >
                                    <option value="">Ingen kategori</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Beskrivelse</label>
                                <div className="flex-1 flex flex-col gap-2">
                                    {/* Tabs */}
                                    <div className="flex items-center gap-1 border-b border-gray-200 mb-2">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewMode(false)}
                                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${!previewMode
                                                ? "border-[#4F46E5] text-[#4F46E5]"
                                                : "border-transparent text-gray-500 hover:text-gray-700"
                                                }`}
                                        >
                                            Rediger
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewMode(true)}
                                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${previewMode
                                                ? "border-[#4F46E5] text-[#4F46E5]"
                                                : "border-transparent text-gray-500 hover:text-gray-700"
                                                }`}
                                        >
                                            Forhåndsvisning
                                        </button>
                                    </div>

                                    {!previewMode ? (
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

                                                        const newText = `${before}### ${selection || 'Overskrift'}${after}`;

                                                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                                                        nativeInputValueSetter?.call(textarea, newText);
                                                        textarea.dispatchEvent(new Event('input', { bubbles: true }));

                                                        textarea.focus();
                                                        textarea.setSelectionRange(start + 4, end + 4);
                                                    }}
                                                    className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors w-8 h-8 flex items-center justify-center"
                                                    title="Overskrift 3"
                                                >
                                                    <span className="text-sm font-bold font-mono">H3</span>
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

                                                        // Toggle bold
                                                        const newText = `${before}**${selection || 'fet tekst'}**${after}`;

                                                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                                                        nativeInputValueSetter?.call(textarea, newText);
                                                        textarea.dispatchEvent(new Event('input', { bubbles: true }));

                                                        textarea.focus();
                                                        textarea.setSelectionRange(start + 2, end + 2);
                                                    }}
                                                    className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors w-8 h-8 flex items-center justify-center"
                                                    title="Fet tekst"
                                                >
                                                    <span className="material-symbols-outlined text-sm">format_bold</span>
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
                                                    className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors w-8 h-8 flex items-center justify-center"
                                                    title="Kursiv"
                                                >
                                                    <span className="material-symbols-outlined text-sm">format_italic</span>
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

                                                        const newText = `${before}\n- ${selection || 'listepunkt'}${after}`;

                                                        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                                                        nativeInputValueSetter?.call(textarea, newText);
                                                        textarea.dispatchEvent(new Event('input', { bubbles: true }));

                                                        textarea.focus();
                                                        textarea.setSelectionRange(start + 3, end + 3);
                                                    }}
                                                    className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors w-8 h-8 flex items-center justify-center"
                                                    title="Punktliste"
                                                >
                                                    <span className="material-symbols-outlined text-sm">format_list_bulleted</span>
                                                </button>
                                            </div>

                                            <textarea
                                                id="description-input"
                                                {...register("description")}
                                                rows={12}
                                                className="w-full flex-1 min-h-[400px] px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none text-gray-900 placeholder:text-gray-400 resize-none font-mono text-sm leading-relaxed"
                                                placeholder="Beskriv arrangementet..."
                                            />
                                            <p className="text-xs text-gray-400">
                                                Tips: Du kan bruke Markdown for formatering. **Fet**, *Kursiv*, - Liste.<br />
                                                For å få ny linje, trykk <strong>Enter to ganger</strong>.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm max-w-none bg-gray-50/50 p-6 rounded-xl border border-gray-200 min-h-[400px]">
                                            <ReactMarkdown>
                                                {/* Use getValues to get current value for preview */}
                                                {(document.getElementById('description-input') as HTMLTextAreaElement)?.value || "Ingen beskrivelse skjult."}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>


                {/* Right Column - Cover Image & Notification */}
                <div className="space-y-6">
                    {/* Notification Card */}
                    <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 hover:border-orange-200 transition-colors">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0 text-orange-600 shadow-sm shadow-orange-100">
                                <span className="material-symbols-outlined text-xl">mark_email_unread</span>
                            </div>
                            <div className="flex-1 space-y-1">
                                <label htmlFor="sendNotification" className="block text-sm font-bold text-gray-900 cursor-pointer select-none">
                                    Send e-postvarsel
                                </label>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Send e-post til alle medlemmer om dette arrangementet.
                                </p>
                            </div>
                            <input
                                type="checkbox"
                                {...register("sendNotification")}
                                id="sendNotification"
                                className="w-6 h-6 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer accent-indigo-600 mt-1"
                            />
                        </div>
                    </div>

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
                                        onClick={() => {
                                            setUploadedCoverImage(null);
                                            setValue("coverImage", "", { shouldValidate: true });
                                        }}
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
                                            const uploadedFile = res && Array.isArray(res) ? res[0] : null;
                                            const fileUrl = uploadedFile?.url || uploadedFile?.serverData?.url;

                                            if (fileUrl) {
                                                setUploadedCoverImage(fileUrl);
                                                setValue("coverImage", fileUrl, { shouldValidate: true });
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
                        {errors.coverImage && <p className="text-red-500 text-xs mt-1">{errors.coverImage.message}</p>}
                    </div>

                    {/* Economics */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#4F46E5]">payments</span>
                            Økonomi
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Totalkostnad (p.p.)</label>
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
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Klubbstøtte (p.p.)</label>
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
            </div>

            {/* Location, Time & Economics - Full Width */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-6 justify-between">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#4F46E5]">location_on</span>
                        Tid og Sted
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Time Row */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Starttidspunkt *</label>
                        <input
                            type="datetime-local"
                            {...register("startAt")}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none text-gray-900"
                        />
                        {errors.startAt && <p className="text-red-500 text-xs mt-1">{errors.startAt?.message}</p>}
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-semibold text-gray-700">Sluttidspunkt (valgfritt)</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isSameDay"
                                    {...register("isSameDay")}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                />
                                <label htmlFor="isSameDay" className="text-xs font-medium text-gray-600 cursor-pointer select-none">
                                    Samme dag
                                </label>
                            </div>
                        </div>
                        <input
                            type="datetime-local"
                            {...register("endAt")}
                            disabled={isSameDay}
                            className={`w-full px-4 py-2.5 rounded-xl border transition-all outline-none ${isSameDay
                                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                : "border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-gray-900"
                                }`}
                        />
                        {errors.endAt && <p className="text-red-500 text-xs mt-1">{errors.endAt?.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Påmeldingsfrist</label>
                        <input
                            type="datetime-local"
                            {...register("registrationDeadline")}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none text-gray-900"
                        />
                        {errors.registrationDeadline && <p className="text-red-500 text-xs mt-1">{errors.registrationDeadline?.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Maks antall plasser</label>
                        <input
                            type="number"
                            {...register("maxAttendees")}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none text-gray-900"
                            placeholder="Ubegrenset hvis tomt"
                            min="1"
                        />
                        {errors.maxAttendees && <p className="text-red-500 text-xs mt-1">{errors.maxAttendees?.message}</p>}
                    </div>

                    {/* Location & Cost Row */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-semibold text-gray-700">Stednavn</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isTba"
                                    {...register("isTba")}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                />
                                <label htmlFor="isTba" className="text-xs font-medium text-gray-600 cursor-pointer select-none">
                                    Sted kommer (TBA)
                                </label>
                            </div>
                        </div>
                        <input
                            {...register("location")}
                            disabled={isTba}
                            className={`w-full px-4 py-2.5 rounded-xl border transition-all outline-none ${isTba
                                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                : "border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-gray-900 placeholder:text-gray-400"
                                }`}
                            placeholder="Eks: Klubbhuset"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse</label>
                        <input
                            {...register("address")}
                            disabled={isTba}
                            className={`w-full px-4 py-2.5 rounded-xl border transition-all outline-none ${isTba
                                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                                : "border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] text-gray-900 placeholder:text-gray-400"
                                }`}
                            placeholder="Gateadresse 123, 0000 Sted"
                        />
                    </div>

                </div>
            </div>


            {/* Program / Schedule - Full Width */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#4F46E5]">event_note</span>
                        Program
                    </h2>
                    <button
                        type="button"
                        onClick={() => {
                            const currentStartDate = (document.querySelector('input[name="startAt"]') as HTMLInputElement)?.value;
                            const defaultDate = currentStartDate ? currentStartDate.split('T')[0] : "";
                            append({ time: "", date: defaultDate, title: "", description: "" });
                        }}
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
                            <div className="w-40 flex-shrink-0">
                                <input
                                    type="date"
                                    {...register(`program.${index}.date` as const)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#4F46E5] outline-none text-sm"
                                />
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
        </form >
    );
}
