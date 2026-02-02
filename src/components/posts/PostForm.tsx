"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { postSchema, PostInput } from "@/lib/validators/posts";
import { PostCategory } from "@prisma/client";

interface PostFormProps {
    initialData?: Partial<PostInput> & { id?: string };
    onSubmit: (data: PostInput) => Promise<{ success: boolean; error?: string }>;
    submitButtonText: string;
    isEditMode?: boolean;
}

export function PostForm({ initialData, onSubmit, submitButtonText, isEditMode = false }: PostFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Innhold</label>

                {/* Toolbar */}
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 border border-gray-200 rounded-xl">
                    <button type="button" onClick={() => insertFormat("# ")} className="p-2 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-700" title="Overskrift 1">H1</button>
                    <button type="button" onClick={() => insertFormat("## ")} className="p-2 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-700" title="Overskrift 2">H2</button>
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
                    rows={15}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none leading-relaxed font-mono text-sm"
                />
                <p className="text-xs text-gray-400 text-right">Markdown forhåndsvisning støttes</p>
                {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content.message}</p>}
            </div>

            {/* Error Message */}
            {submitError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined">error</span>
                    {submitError}
                </div>
            )}

            {/* Actions */}
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
        </form>
    );
}
