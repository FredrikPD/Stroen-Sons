"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { postSchema, PostInput } from "@/lib/validators/posts";
import { PostCategory } from "@prisma/client";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
// import { UploadDropzone } from "@/lib/uploadthing"; 
import { useUploadThing } from "@/utils/uploadthing";
import { toast } from "sonner";
import { deleteFile } from "@/server/actions/files";

interface PostFormProps {
    initialData?: Partial<PostInput> & { id?: string };
    onSubmit: (data: PostInput) => Promise<{ success: boolean; error?: string }>;
    submitButtonText: string;
    isEditMode?: boolean;
    pageTitle?: string;
    pageDescription?: string;
}

export function PostForm({ initialData, onSubmit, submitButtonText, isEditMode = false, pageTitle, pageDescription }: PostFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"write" | "preview">("write");
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
                <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div>
                            {pageTitle && <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>}
                            {pageDescription && <p className="text-gray-500 text-sm">{pageDescription}</p>}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Title & Category Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tittel</label>
                            <input
                                {...register("title")}
                                placeholder="Skriv en overskrift..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                            />
                            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</label>
                            <div className="relative">
                                <select
                                    {...register("category")}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                >
                                    <option value="NYHET">Nyhet</option>
                                    <option value="ARRANGEMENT">Arrangement</option>
                                    <option value="REFERAT">Referat</option>
                                    <option value="SOSIALT">Sosialt</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">expand_more</span>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Innhold</label>

                            {/* View Mode Toggle */}
                            <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                <button
                                    type="button"
                                    onClick={() => setViewMode("write")}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === "write"
                                        ? "bg-white text-indigo-600 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    Rediger
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode("preview")}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode === "preview"
                                        ? "bg-white text-indigo-600 shadow-sm"
                                        : "text-gray-500 hover:text-gray-700"
                                        }`}
                                >
                                    Forhåndsvisning
                                </button>
                            </div>
                        </div>

                        {viewMode === "write" ? (
                            <>
                                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 border border-gray-200 rounded-xl">
                                    <button type="button" onClick={() => insertFormat("### ")} className="p-2 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-700" title="Overskrift 3">H3</button>
                                    <div className="w-px h-6 bg-gray-300 mx-1 self-center" />
                                    <button type="button" onClick={() => insertFormat("**", "**")} className="p-2 hover:bg-gray-200 rounded-lg text-gray-700" title="Fet">
                                        <span className="material-symbols-outlined text-lg">format_bold</span>
                                    </button>
                                    <button type="button" onClick={() => insertFormat("*", "*")} className="p-2 hover:bg-gray-200 rounded-lg text-gray-700" title="Kursiv">
                                        <span className="material-symbols-outlined text-lg">format_italic</span>
                                    </button>
                                    <button type="button" onClick={() => insertFormat("- ")} className="p-2 hover:bg-gray-200 rounded-lg text-gray-700" title="Liste">
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
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none leading-relaxed font-mono text-sm"
                                />
                            </>
                        ) : (
                            <div className="w-full px-8 py-8 bg-white border border-gray-200 rounded-xl min-h-[400px]">
                                <div className="prose prose-zinc max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-indigo-600 prose-li:text-gray-600">
                                    <ReactMarkdown>{watch("content") || "*Ingen innhold å vise*"}</ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
                    </div>
                </div>

                {/* Right Column: Attachments */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-600">attach_file</span>
                            Vedlegg
                        </h2>

                        {/* File List */}
                        {watch("attachments") && watch("attachments")!.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {watch("attachments")!.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl group hover:border-indigo-200 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 bg-white border border-gray-200 text-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <span className="material-symbols-outlined text-lg">description</span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold text-gray-900 truncate">{file.name}</span>
                                                <span className="text-[10px] text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
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
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Upload Area */}
                        <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors p-6 flex flex-col items-center justify-center gap-3 cursor-pointer relative group min-h-[160px]">
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

                            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-xl">upload_file</span>
                            </div>

                            <div className="text-center space-y-0.5">
                                <p className="text-xs font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">
                                    Last opp filer
                                </p>
                                <p className="text-[10px] text-gray-400">
                                    Bilder/PDF (Maks 16MB)
                                </p>
                            </div>

                            {isUploading && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20 backdrop-blur-sm rounded-xl">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-100 border-t-indigo-600"></div>
                                        <span className="text-[10px] font-bold text-indigo-600">Laster opp...</span>
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
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
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
