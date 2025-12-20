"use client";

import ReactMarkdown from "react-markdown";

import { useState, useRef } from "react";
import { PostCategory } from "@prisma/client";
import { useRouter } from "next/navigation";

interface PostFormProps {
    initialData?: {
        title: string;
        content: string;
        category: PostCategory;
    };
    onSubmit: (data: { title: string; content: string; category: PostCategory }) => Promise<{ success: boolean; error?: string }>;
    submitLabel?: string;
    loadingLabel?: string;
    cancelHref?: string;
}

export default function PostForm({
    initialData,
    onSubmit,
    submitLabel = "Publiser Innlegg",
    loadingLabel = "Publiserer...",
    cancelHref = "/admin"
}: PostFormProps) {
    const router = useRouter();
    const [title, setTitle] = useState(initialData?.title || "");
    const [content, setContent] = useState(initialData?.content || "");
    const [category, setCategory] = useState<PostCategory>(initialData?.category || "NYHET");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const insertFormat = (prefix: string, suffix: string = "") => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        const newText = before + prefix + selection + suffix + after;
        setContent(newText);

        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + prefix.length + selection.length + suffix.length;
            textarea.setSelectionRange(start + prefix.length, newCursorPos);
        }, 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const res = await onSubmit({ title, content, category });

        if (res.success) {
            setMessage({ type: 'success', text: "Lagret!" });
            if (!initialData) {
                setTitle("");
                setContent("");
                setCategory("NYHET");
            }
        } else {
            setMessage({ type: 'error', text: res.error || "Noe gikk galt." });
        }
        setLoading(false);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden relative">
            {/* Decorative Top Bar */}
            <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            <div className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Title & Category Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tittel</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Skriv en overskrift..."
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</label>
                            <div className="relative">
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as PostCategory)}
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

                    {/* Editor & Preview Split */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* Editor Column */}
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
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Skriv innholdet her..."
                                required
                                rows={20}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none leading-relaxed font-mono text-sm"
                            />
                        </div>

                        {/* Preview Column */}
                        <div className="space-y-2 hidden lg:block">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Forhåndsvisning</label>
                            <div className="w-full h-[calc(100%-2rem)] min-h-[580px] px-6 py-6 bg-white border border-gray-200 rounded-xl overflow-y-auto prose prose-zinc max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-indigo-600 prose-li:text-gray-600">
                                {content ? (
                                    <ReactMarkdown>{content}</ReactMarkdown>
                                ) : (
                                    <p className="text-gray-400 italic">Ingen innhold å vise...</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex items-center justify-between border-t border-gray-100 mt-8">
                        <button
                            type="button"
                            onClick={() => router.push(cancelHref)}
                            className="px-6 py-2.5 text-gray-500 hover:text-gray-900 font-bold text-sm transition-colors"
                        >
                            Avbryt
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                                    {loadingLabel}
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-lg">send</span>
                                    {submitLabel}
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>

            {/* Feedback Message Overlay */}
            {message && (
                <div className={`absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center transition-all animate-in fade-in`}>
                    <div className={`p-6 rounded-2xl border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} shadow-xl max-w-sm text-center`}>
                        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${message.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                            <span className="material-symbols-outlined text-3xl">{message.type === 'success' ? 'check' : 'error'}</span>
                        </div>
                        <h3 className={`text-lg font-bold mb-1 ${message.type === 'success' ? 'text-emerald-900' : 'text-red-900'}`}>
                            {message.type === 'success' ? 'Suksess!' : 'Feil oppstod'}
                        </h3>
                        <p className={`${message.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
                            {message.text}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
