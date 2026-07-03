"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { postSchema, PostInput } from "@/lib/validators/posts";
import ReactMarkdown from "react-markdown";
import { useUploadThing } from "@/utils/uploadthing";
import { toast } from "sonner";
import { deleteFile } from "@/server/actions/files";
import { useModal } from "@/components/providers/ModalContext";
import { useRouter } from "next/navigation";
import { ActionInfo } from "@/components/ui/ActionInfo";
import { SERIF, label, input, textarea, btnPrimary, card } from "@/components/admin/ui";

interface PostFormProps {
    initialData?: Partial<PostInput> & { id?: string };
    onSubmit: (data: PostInput) => Promise<{ success: boolean; error?: string }>;
    submitButtonText: string;
    isEditMode?: boolean;
    pageTitle?: string;
    pageDescription?: string;
    onSuccess?: () => void;
    redirectOnSuccess?: string;
    categories?: { id: string; name: string }[];
}

export function PostForm({ initialData, onSubmit, submitButtonText, isEditMode = false, pageTitle, pageDescription, onSuccess, redirectOnSuccess, categories = [] }: PostFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"write" | "preview">("write");
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const { openAlert } = useModal();
    const router = useRouter();

    const { startUpload, isUploading } = useUploadThing("postAttachment");

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<PostInput>({
        resolver: zodResolver(postSchema) as any,
        defaultValues: {
            title: initialData?.title || "",
            content: initialData?.content || "",
            category: initialData?.category || "NYHET",
            eventId: initialData?.eventId || undefined,
        },
    });

    // Helper for formatting
    const insertFormat = (prefix: string, suffix: string = "") => {
        // Since we are using react-hook-form, we need to manipulate the value via the internal ref or just the DOM node
        // but react-hook-form's register connects the ref. We can use the one we attached via `ref={e => { ref(e); textareaRef.current = e; }}` trick or just get it via document if needed, 
        // but cleaner is to use the watch/setValue pattern or just native event manipulation.
        // Let's stick to the previous implementation style but adapted for RHF.

        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value; // Current value in DOM

        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        const newText = before + prefix + selection + suffix + after;

        // Update form state
        setValue("content", newText, { shouldDirty: true });

        // Restore focus and cursor
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + prefix.length + selection.length + suffix.length;
            textarea.setSelectionRange(start + prefix.length, newCursorPos);
        }, 0);
    };

    // We need to merge refs for the textarea
    const { ref: registerRef, ...restRegister } = register("content");

    const handleFormSubmit = async (data: PostInput) => {
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const res = await onSubmit(data);
            if (!res.success) {
                setSubmitError(res.error || "Noe gikk galt.");
            } else {
                await openAlert({
                    title: isEditMode ? "Innlegg oppdatert" : "Innlegg publisert",
                    message: isEditMode ? "Endringene dine er lagret." : "Innlegget er nå publisert på tavlen.",
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
            }
        } catch (error) {
            console.error(error);
            setSubmitError("En uventet feil oppstod.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">

            {/* Header with Submit Button */}
            {(pageTitle || pageDescription) && (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-gray-300 pb-6 mb-6">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">Innhold</p>
                        {pageTitle && <h1 className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none" style={{ fontFamily: SERIF }}>{pageTitle}</h1>}
                        {pageDescription && <p className="mt-3 text-sm text-text-secondary max-w-2xl leading-relaxed">{pageDescription}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`${btnPrimary} shrink-0`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                Lagrer...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-lg">save</span>
                                {submitButtonText}
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Notification / consequences banner */}
            <ActionInfo
                variant="warning"
                icon="notifications_active"
                title={isEditMode ? "Hva skjer når du lagrer?" : "Hva skjer når du publiserer?"}
                items={
                    isEditMode
                        ? [
                              "Alle medlemmer får et varsel (i appen og som push) om at innlegget er oppdatert – hver gang du lagrer.",
                              "E-post sendes bare hvis du huker av for «Send e-postvarsel».",
                              "Merk: bare administratorer kan lagre endringer.",
                          ]
                        : [
                              "Innlegget legges ut på tavlen og alle medlemmer får et varsel i appen og en push-melding med en gang.",
                              "E-post sendes bare hvis du huker av for «Send e-postvarsel».",
                          ]
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Title & Category Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <label className={label}>Tittel</label>
                            <input
                                {...register("title")}
                                placeholder="Skriv en overskrift..."
                                className={input}
                            />
                            {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title.message}</p>}
                        </div>
                        <div>
                            <label className={label}>Kategori</label>
                            <div className="relative">
                                <select
                                    {...register("category")}
                                    className={`${input} appearance-none pr-10`}
                                >
                                    {categories.length > 0 ? (
                                        categories.map((cat) => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))
                                    ) : (
                                        <>
                                            <option value="NYHET">Nyhet</option>
                                            <option value="ARRANGEMENT">Arrangement</option>
                                            <option value="REFERAT">Referat</option>
                                            <option value="SOSIALT">Sosialt</option>
                                        </>
                                    )}
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                            </div>
                        </div>
                    </div>



                    {/* Content */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className={`${label} mb-0`}>Innhold</label>

                            {/* View Mode Toggle */}
                            <div className="flex items-center bg-cream rounded-lg p-1">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("write")}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === "write"
                                        ? "bg-white text-primary shadow-sm"
                                        : "text-text-secondary hover:text-gray-900"
                                        }`}
                                >
                                    Rediger
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("preview")}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === "preview"
                                        ? "bg-white text-primary shadow-sm"
                                        : "text-text-secondary hover:text-gray-900"
                                        }`}
                                >
                                    Forhåndsvisning
                                </button>
                            </div>
                        </div>

                        {viewMode === "write" ? (
                            <>
                                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-cream/40 border border-border-color rounded-xl">
                                    <button type="button" onClick={() => insertFormat("### ")} className="p-2 hover:bg-black/[0.04] rounded-lg text-sm font-bold text-gray-700" title="Overskrift 3">H3</button>
                                    <div className="w-px h-6 bg-border-color mx-1 self-center" />
                                    <button type="button" onClick={() => insertFormat("**", "**")} className="p-2 hover:bg-black/[0.04] rounded-lg text-gray-700" title="Fet">
                                        <span className="material-symbols-outlined text-lg">format_bold</span>
                                    </button>
                                    <button type="button" onClick={() => insertFormat("*", "*")} className="p-2 hover:bg-black/[0.04] rounded-lg text-gray-700" title="Kursiv">
                                        <span className="material-symbols-outlined text-lg">format_italic</span>
                                    </button>
                                    <button type="button" onClick={() => insertFormat("- ")} className="p-2 hover:bg-black/[0.04] rounded-lg text-gray-700" title="Liste">
                                        <span className="material-symbols-outlined text-lg">format_list_bulleted</span>
                                    </button>
                                </div>

                                <textarea
                                    {...restRegister}
                                    ref={(e) => {
                                        registerRef(e);
                                        textareaRef.current = e;
                                    }}
                                    placeholder="Skriv innholdet her..."
                                    rows={20}
                                    className={`${textarea} resize-none leading-relaxed font-mono`}
                                />
                            </>
                        ) : (
                            <div className={`w-full px-8 py-8 ${card} min-h-[400px]`}>
                                <div className="prose prose-zinc max-w-none prose-headings:font-normal prose-headings:text-gray-900 prose-p:text-text-secondary prose-a:text-primary prose-li:text-text-secondary" style={{ fontFamily: SERIF }}>
                                    <ReactMarkdown>{watch("content") || "*Ingen innhold å vise*"}</ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {errors.content && <p className="text-red-600 text-xs mt-1">{errors.content.message}</p>}
                    </div>
                </div>

                {/* Right Column: Attachments */}
                <div className="space-y-6">
                    {/* Notification Card */}
                    <div className="bg-amber-50 border border-amber-200/70 rounded-2xl p-5 hover:border-amber-300 transition-colors">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600">
                                <span className="material-symbols-outlined text-xl">mark_email_unread</span>
                            </div>
                            <div className="flex-1 space-y-1">
                                <label htmlFor="sendNotification" className="block text-sm font-bold text-gray-900 cursor-pointer select-none">
                                    Send e-postvarsel
                                </label>
                                <ActionInfo variant="warning" compact>
                                    {isEditMode
                                        ? "Huker du av her, sender vi en e-post til alle aktive medlemmer om oppdateringen når du lagrer. Lar du den stå tom, blir det ingen e-post – men medlemmene får uansett et varsel i appen."
                                        : "Sender e-post til alle aktive medlemmer når du publiserer. Dette kan ikke angres. Varsel i appen og push sendes uansett, også hvis du lar denne stå av."}
                                </ActionInfo>
                            </div>
                            <input
                                type="checkbox"
                                {...register("sendNotification")}
                                id="sendNotification"
                                className="w-6 h-6 rounded border-gray-300 cursor-pointer accent-primary mt-1 focus:ring-primary"
                            />
                        </div>
                    </div>


                    <div className={`${card} p-6 space-y-4`}>
                        <h2 className="text-2xl font-normal text-gray-900 flex items-center gap-2" style={{ fontFamily: SERIF }}>
                            <span className="material-symbols-outlined text-primary">attach_file</span>
                            Vedlegg
                        </h2>

                        <ActionInfo variant="danger" compact>
                            Klikker du på søppelbøtta, slettes filen fra lagringen med en gang – ikke først når du lagrer. Dette kan ikke angres, du må laste opp filen på nytt for å få den tilbake.
                        </ActionInfo>

                        {/* File List */}
                        {watch("attachments") && watch("attachments")!.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {watch("attachments")!.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-cream/40 border border-border-color rounded-xl group hover:border-primary/50 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 bg-white border border-border-color text-primary rounded-lg flex items-center justify-center flex-shrink-0">
                                                <span className="material-symbols-outlined text-lg">description</span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold text-gray-900 truncate">{file.name}</span>
                                                <span className="text-[10px] text-gray-500 tabular-nums">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const current = watch("attachments") || [];
                                                // Optimistic update
                                                setValue("attachments", current.filter((_, i) => i !== index));

                                                if (file.key) {
                                                    try {
                                                        const res = await deleteFile(file.key);
                                                        if (!res.success) {
                                                            toast.error("Kunne ikke slette filen fra serveren");
                                                            // Revert? For now assume user wants it gone
                                                        } else {
                                                            toast.success("Fil slettet");
                                                        }
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Upload Area */}
                        <div className="border-2 border-dashed border-border-color rounded-xl bg-cream/40 hover:bg-cream/70 hover:border-primary/50 transition-colors p-6 flex flex-col items-center justify-center gap-3 cursor-pointer relative group min-h-[160px]">
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                multiple
                                onChange={async (e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length === 0) return;

                                    try {
                                        const res = await startUpload(files);

                                        if (res) {
                                            const current = watch("attachments") || [];
                                            const newFiles = res.map(file => ({
                                                url: file.url,
                                                key: file.key, // Capture key for deletion
                                                name: file.name,
                                                size: file.size,
                                                type: file.type || "unknown"
                                            }));
                                            setValue("attachments", [...current, ...newFiles]);
                                            toast.success("Filer lastet opp!");
                                        }
                                    } catch (error: any) {
                                        console.error("Upload failed:", error);
                                        toast.error("Feil ved opplasting: " + (error.message || "Ukjent feil"));
                                    }

                                    // Reset input
                                    e.target.value = "";
                                }}
                            />

                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-xl">upload_file</span>
                            </div>

                            <div className="text-center space-y-0.5">
                                <p className="text-xs font-bold text-gray-700 group-hover:text-primary transition-colors">
                                    Last opp filer
                                </p>
                                <p className="text-[10px] text-gray-400">
                                    Bilder/PDF (Maks 16MB)
                                </p>
                            </div>

                            {isUploading && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20 backdrop-blur-sm rounded-xl">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary/30 border-t-primary"></div>
                                        <span className="text-[10px] font-bold text-primary">Laster opp...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {submitError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined">error</span>
                    {submitError}
                </div>
            )}

            {/* Actions (Fallback) */}
            {(!pageTitle && !pageDescription) && (
                <div className="pt-4 flex items-center justify-end">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={btnPrimary}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                Behandler...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-lg">send</span>
                                {submitButtonText}
                            </>
                        )}
                    </button>
                </div>
            )}
        </form >
    );
}
