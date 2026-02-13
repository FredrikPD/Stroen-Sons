"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    deleteExpense,
    getAdminExpenses,
    getMembersAndEvents,
    registerExpense,
    updateExpense
} from "@/server/actions/finance";
import { Avatar } from "@/components/Avatar";
import { useUploadThing } from "@/utils/uploadthing";
import { deleteFile } from "@/server/actions/files";
import { useModal } from "@/components/providers/ModalContext";
import { LoadingState } from "@/components/ui/LoadingState";
import { toast } from "sonner";

type Member = {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
};

type Event = {
    id: string;
    title: string;
    startAt: string;
};

type ExpenseItem = {
    id: string;
    date: string;
    description: string;
    category: string;
    totalAmount: number;
    splitCount: number;
    memberIds: string[];
    members: { id: string; name: string }[];
    eventId: string | null;
    eventTitle: string | null;
    receiptUrl: string | null;
    receiptKey: string | null;
    transactionIds: string[];
    createdAt: string;
};

type ReceiptFile = {
    url: string;
    key: string;
    name: string;
    size?: number;
};

const CATEGORIES = [
    "Mat & Drikke",
    "Transport",
    "Leie av lokale",
    "Utstyr",
    "Overnatting",
    "Annet"
];

const toInputDate = (value: string | Date) => {
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return new Date().toISOString().split("T")[0];
    return date.toISOString().split("T")[0];
};

const parseAmount = (value: string) => {
    const parsed = Number.parseFloat(value.replace(",", "."));
    if (!Number.isFinite(parsed)) return 0;
    return Math.round((Math.abs(parsed) + Number.EPSILON) * 100) / 100;
};

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("nb-NO", {
        style: "currency",
        currency: "NOK",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("nb-NO", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });

const fileNameFromUrl = (url: string) => {
    try {
        const pathname = new URL(url).pathname;
        return decodeURIComponent(pathname.split("/").pop() || "kvittering");
    } catch {
        return "kvittering";
    }
};

const EXPENSE_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export default function ExpensesPage() {
    const { openConfirm, openAlert } = useModal();
    const { startUpload, isUploading } = useUploadThing("expenseReceipt");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [members, setMembers] = useState<Member[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [expenses, setExpenses] = useState<ExpenseItem[]>([]);

    const [mode, setMode] = useState<"create" | "edit">("create");
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
    const [editingTransactionIds, setEditingTransactionIds] = useState<string[]>([]);
    const [originalReceiptKey, setOriginalReceiptKey] = useState<string | null>(null);

    const [amountInput, setAmountInput] = useState("");
    const [dateInput, setDateInput] = useState(new Date().toISOString().split("T")[0]);
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [selectedEventId, setSelectedEventId] = useState("");
    const [splitEnabled, setSplitEnabled] = useState(true);
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [memberQuery, setMemberQuery] = useState("");
    const [receiptFile, setReceiptFile] = useState<ReceiptFile | null>(null);

    const [listQuery, setListQuery] = useState("");
    const [debouncedListQuery, setDebouncedListQuery] = useState("");
    const [listCategory, setListCategory] = useState("ALL");
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMoreExpenses, setHasMoreExpenses] = useState(false);
    const [loadingList, setLoadingList] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const didBootstrapRef = useRef(false);
    const listRequestRef = useRef(0);

    const loadFormData = async () => {
        const formData = await getMembersAndEvents();
        setMembers((formData.members || []) as Member[]);
        const incomingEvents = (formData.events || []) as Array<{
            id: string;
            title: string;
            startAt: Date | string;
        }>;
        setEvents(
            incomingEvents.map((event) => ({
                id: event.id,
                title: event.title,
                startAt: new Date(event.startAt).toISOString()
            }))
        );
    };

    const loadExpenses = async (options?: {
        reset?: boolean;
        cursor?: string | null;
        query?: string;
        category?: string;
    }) => {
        const reset = options?.reset ?? false;
        const requestId = ++listRequestRef.current;

        if (reset) {
            setLoadingList(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const response = await getAdminExpenses({
                limit: EXPENSE_PAGE_SIZE,
                cursor: reset ? null : (options?.cursor ?? nextCursor),
                query: options?.query ?? debouncedListQuery,
                category: options?.category ?? listCategory
            });

            if (requestId !== listRequestRef.current) {
                return;
            }

            if (response.success && response.expenses) {
                const incoming = response.expenses as ExpenseItem[];
                setExpenses((prev) => {
                    if (reset) return incoming;

                    const merged = new Map(prev.map((expense) => [expense.id, expense]));
                    incoming.forEach((expense) => merged.set(expense.id, expense));
                    return Array.from(merged.values());
                });
                setNextCursor(response.nextCursor || null);
                setHasMoreExpenses(Boolean(response.hasMore && response.nextCursor));
                return;
            }

            if (reset) setExpenses([]);
            toast.error(response.error || "Kunne ikke hente utgifter.");
        } catch (error) {
            console.error("Failed to load admin expenses:", error);
            if (reset) setExpenses([]);
            toast.error("Kunne ikke hente utgifter.");
        } finally {
            if (requestId !== listRequestRef.current) {
                return;
            }
            if (reset) {
                setLoadingList(false);
            } else {
                setLoadingMore(false);
            }
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedListQuery(listQuery.trim());
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [listQuery]);

    useEffect(() => {
        let active = true;

        const bootstrap = async () => {
            setLoading(true);
            await loadFormData();
            await loadExpenses({
                reset: true,
                query: "",
                category: listCategory
            });
            if (!active) return;
            didBootstrapRef.current = true;
            setLoading(false);
        };

        void bootstrap();
        return () => {
            active = false;
            listRequestRef.current += 1;
        };
    }, []);

    useEffect(() => {
        if (!didBootstrapRef.current) return;
        void loadExpenses({
            reset: true,
            query: debouncedListQuery,
            category: listCategory
        });
    }, [debouncedListQuery, listCategory]);

    const resetForm = () => {
        setMode("create");
        setEditingExpenseId(null);
        setEditingTransactionIds([]);
        setOriginalReceiptKey(null);
        setAmountInput("");
        setDateInput(new Date().toISOString().split("T")[0]);
        setDescription("");
        setCategory(CATEGORIES[0]);
        setSelectedEventId("");
        setSplitEnabled(true);
        setSelectedMemberIds([]);
        setMemberQuery("");
        setReceiptFile(null);
    };

    const filteredMembers = useMemo(() => {
        const query = memberQuery.trim().toLowerCase();
        if (!query) return members;
        return members.filter((member) => {
            const fullName = `${member.firstName || ""} ${member.lastName || ""}`.trim().toLowerCase();
            return fullName.includes(query);
        });
    }, [members, memberQuery]);

    const displayedExpenses = useMemo(() => {
        return expenses.filter((expense) => {
            const matchesCategory = listCategory === "ALL" || expense.category === listCategory;
            if (!matchesCategory) return false;

            const query = listQuery.trim().toLowerCase();
            if (!query) return true;

            const inDescription = expense.description.toLowerCase().includes(query);
            const inCategory = expense.category.toLowerCase().includes(query);
            const inMembers = expense.members.some((member) => member.name.toLowerCase().includes(query));
            const inEvent = (expense.eventTitle || "").toLowerCase().includes(query);

            return inDescription || inCategory || inMembers || inEvent;
        });
    }, [expenses, listCategory, listQuery]);

    const totalVisibleAmount = useMemo(
        () => displayedExpenses.reduce((sum, expense) => sum + expense.totalAmount, 0),
        [displayedExpenses]
    );

    const splitVisibleCount = useMemo(
        () => displayedExpenses.filter((expense) => expense.splitCount > 0).length,
        [displayedExpenses]
    );

    const amount = parseAmount(amountInput);
    const splitCount = splitEnabled ? selectedMemberIds.length : 0;
    const amountPerPerson = splitCount > 0 ? amount / splitCount : amount;

    const selectedAllMembers = filteredMembers.length > 0 && filteredMembers.every((member) => selectedMemberIds.includes(member.id));

    const toggleMemberSelection = (memberId: string) => {
        setSelectedMemberIds((prev) => {
            if (prev.includes(memberId)) return prev.filter((id) => id !== memberId);
            return [...prev, memberId];
        });
    };

    const toggleSelectAllVisibleMembers = () => {
        if (selectedAllMembers) {
            setSelectedMemberIds((prev) => prev.filter((id) => !filteredMembers.some((member) => member.id === id)));
            return;
        }

        setSelectedMemberIds((prev) => {
            const merged = new Set(prev);
            filteredMembers.forEach((member) => merged.add(member.id));
            return Array.from(merged);
        });
    };

    const startEditingExpense = (expense: ExpenseItem) => {
        setMode("edit");
        setEditingExpenseId(expense.id);
        setEditingTransactionIds(expense.transactionIds);
        setOriginalReceiptKey(expense.receiptKey || null);
        setAmountInput(expense.totalAmount.toFixed(2));
        setDateInput(toInputDate(expense.date));
        setDescription(expense.description);
        setCategory(expense.category);
        setSelectedEventId(expense.eventId || "");
        setSplitEnabled(expense.splitCount > 0);
        setSelectedMemberIds(expense.memberIds);
        setMemberQuery("");

        if (expense.receiptUrl && expense.receiptKey) {
            setReceiptFile({
                url: expense.receiptUrl,
                key: expense.receiptKey,
                name: fileNameFromUrl(expense.receiptUrl)
            });
        } else {
            setReceiptFile(null);
        }
    };

    const handleRemoveReceipt = async () => {
        if (!receiptFile) return;

        const isPersistedCurrentReceipt = mode === "edit" && receiptFile.key === originalReceiptKey;

        if (!isPersistedCurrentReceipt) {
            const deleted = await deleteFile(receiptFile.key);
            if (!deleted.success) {
                toast.error("Kunne ikke slette filen fra serveren.");
            }
        }

        setReceiptFile(null);
    };

    const handleUploadReceipt = async (fileList: FileList | null) => {
        const files = Array.from(fileList || []);
        if (files.length === 0) return;

        try {
            const uploaded = await startUpload(files);
            if (!uploaded || uploaded.length === 0) return;

            const next = uploaded[0];
            if (receiptFile && receiptFile.key !== originalReceiptKey) {
                await deleteFile(receiptFile.key);
            }

            setReceiptFile({
                url: next.ufsUrl,
                key: next.key,
                name: next.name,
                size: next.size
            });

            toast.success("Kvittering lastet opp.");
        } catch (error) {
            console.error("Upload failed:", error);
            toast.error("Opplasting feilet.");
        }
    };

    const validateForm = async () => {
        if (!description.trim()) {
            await openAlert({
                title: "Mangler beskrivelse",
                message: "Legg inn en beskrivelse før du lagrer.",
                type: "warning"
            });
            return false;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            await openAlert({
                title: "Ugyldig beløp",
                message: "Beløp må være større enn 0,00.",
                type: "warning"
            });
            return false;
        }

        if (splitEnabled && selectedMemberIds.length === 0) {
            await openAlert({
                title: "Ingen medlemmer valgt",
                message: "Velg minst ett medlem eller skru av splitting.",
                type: "warning"
            });
            return false;
        }

        return true;
    };

    const handleSave = async () => {
        const isValid = await validateForm();
        if (!isValid) return;

        setSaving(true);

        const payload = {
            amount,
            description: description.trim(),
            category,
            date: new Date(dateInput),
            eventId: selectedEventId || undefined,
            splitMemberIds: splitEnabled ? selectedMemberIds : [],
            receiptUrl: receiptFile?.url || undefined,
            receiptKey: receiptFile?.key || undefined
        };

        const response = mode === "edit" && editingExpenseId
            ? await updateExpense({
                expenseId: editingExpenseId,
                transactionIds: editingTransactionIds,
                ...payload
            })
            : await registerExpense(payload);

        if (response.success) {
            if (mode === "edit" && originalReceiptKey && originalReceiptKey !== (receiptFile?.key || null)) {
                await deleteFile(originalReceiptKey);
            }

            toast.success(mode === "edit" ? "Utgift oppdatert." : "Utgift bokført.");
            await loadExpenses({
                reset: true,
                query: debouncedListQuery,
                category: listCategory
            });
            resetForm();
            setSaving(false);
            return;
        }

        toast.error(response.error || "Noe gikk galt ved lagring.");
        setSaving(false);
    };

    const handleDeleteExpense = async (expense: ExpenseItem) => {
        const confirmed = await openConfirm({
            title: "Slett utgift",
            message: `Vil du slette "${expense.description}"? Dette vil reversere saldoendringer for berørte medlemmer.`,
            type: "error",
            confirmText: "Slett",
            cancelText: "Avbryt"
        });

        if (!confirmed) return;

        setDeletingId(expense.id);
        const response = await deleteExpense({
            expenseId: expense.id,
            transactionIds: expense.transactionIds
        });

        if (response.success) {
            if (expense.receiptKey) {
                await deleteFile(expense.receiptKey);
            }

            toast.success("Utgift slettet.");

            if (editingExpenseId === expense.id) {
                resetForm();
            }

            await loadExpenses({
                reset: true,
                query: debouncedListQuery,
                category: listCategory
            });
        } else {
            toast.error(response.error || "Kunne ikke slette utgiften.");
        }

        setDeletingId(null);
    };

    const handleLoadMore = async () => {
        if (!hasMoreExpenses || !nextCursor || loadingMore || loadingList) return;
        await loadExpenses({
            reset: false,
            cursor: nextCursor,
            query: debouncedListQuery,
            category: listCategory
        });
    };

    if (loading) {
        return <LoadingState />;
    }

    return (
        <div className="space-y-6 pb-16">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Utgifter</h1>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
                <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{mode === "edit" ? "Rediger Utgift" : "Ny Utgift"}</p>
                            <h2 className="text-lg font-bold text-gray-900">
                                {mode === "edit" ? "Oppdater bokført utgift" : "Bokfør ny utgift"}
                            </h2>
                        </div>

                        {mode === "edit" && (
                            <button
                                onClick={resetForm}
                                className="text-xs font-bold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white"
                            >
                                Ny registrering
                            </button>
                        )}
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Beløp</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={amountInput}
                                    onChange={(e) => setAmountInput(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Dato</label>
                                <input
                                    type="date"
                                    value={dateInput}
                                    onChange={(e) => setDateInput(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Beskrivelse</label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Eks. Innkjøp til kickoff"
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Kategori</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                >
                                    {CATEGORIES.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Arrangement (valgfritt)</label>
                                <select
                                    value={selectedEventId}
                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                >
                                    <option value="">Ingen arrangement</option>
                                    {events.map((event) => (
                                        <option key={event.id} value={event.id}>
                                            {event.title} ({formatDate(event.startAt)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                            <div className="flex items-start sm:items-center justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-900">Splitt mellom medlemmer</p>
                                    <p className="text-[11px] text-gray-500">Skru av hvis dette er en felles kostnad uten medlemssaldo.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSplitEnabled((prev) => !prev)}
                                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${splitEnabled ? "bg-indigo-600" : "bg-gray-300"}`}
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${splitEnabled ? "translate-x-6" : "translate-x-1"}`}
                                    />
                                </button>
                            </div>

                            {splitEnabled && (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={memberQuery}
                                            onChange={(e) => setMemberQuery(e.target.value)}
                                            placeholder="Søk medlem"
                                            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={toggleSelectAllVisibleMembers}
                                            className="px-3 py-2 text-xs font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-100"
                                        >
                                            {selectedAllMembers ? "Fjern alle" : "Velg alle"}
                                        </button>
                                    </div>

                                    <div className="max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                                        {filteredMembers.map((member) => {
                                            const selected = selectedMemberIds.includes(member.id);
                                            return (
                                                <button
                                                    type="button"
                                                    key={member.id}
                                                    onClick={() => toggleMemberSelection(member.id)}
                                                    className={`text-left flex items-center gap-2.5 p-2.5 rounded-lg border transition-colors ${selected
                                                        ? "bg-indigo-50 border-indigo-200"
                                                        : "bg-white border-gray-200 hover:border-indigo-200"
                                                        }`}
                                                >
                                                    <Avatar
                                                        src={null}
                                                        initials={`${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`}
                                                        alt={member.firstName || ""}
                                                        size="sm"
                                                        className="w-8 h-8 text-xs bg-[#1F2937]"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-900 truncate">
                                                            {member.firstName} {member.lastName}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{member.role}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Kvittering (valgfritt)</label>
                            {receiptFile ? (
                                <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-gray-900 truncate">{receiptFile.name}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{receiptFile.size ? `${(receiptFile.size / 1024 / 1024).toFixed(2)} MB` : "Eksisterende vedlegg"}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveReceipt}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center cursor-pointer hover:bg-indigo-50/40 hover:border-indigo-300 transition-colors relative overflow-hidden">
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={async (e) => {
                                            await handleUploadReceipt(e.target.files);
                                            e.target.value = "";
                                        }}
                                    />
                                    <span className="material-symbols-outlined text-2xl text-gray-400 mb-1">upload_file</span>
                                    <p className="text-xs font-semibold text-gray-700">Klikk for å laste opp kvittering</p>
                                    <p className="text-[10px] text-gray-500">PDF eller bilde (maks 16MB)</p>

                                    {isUploading && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center backdrop-blur-sm">
                                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#4F46E5]/25 border-t-[#4F46E5]"></div>
                                        </div>
                                    )}
                                </label>
                            )}
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-[#F9FAFB] to-[#F3F6FF] p-4">
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Total</p>
                                    <p className="text-sm font-bold text-gray-900">{formatCurrency(amount)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Medlemmer</p>
                                    <p className="text-sm font-bold text-gray-900">{splitEnabled ? splitCount : 0}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Per medlem</p>
                                    <p className="text-sm font-bold text-gray-900">{formatCurrency(amountPerPerson)}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-4">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving || isUploading}
                                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    {saving ? "Lagrer..." : mode === "edit" ? "Oppdater Utgift" : "Bokfør Utgift"}
                                </button>

                                {mode === "edit" && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-100"
                                    >
                                        Avbryt redigering
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                        <h3 className="text-base font-bold text-gray-900">Historikk og vedlikehold</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Finn tidligere utgifter, rediger feil, eller slett registreringer.</p>
                    </div>

                    <div className="p-4 border-b border-gray-100 space-y-2">
                        <input
                            type="text"
                            value={listQuery}
                            onChange={(e) => setListQuery(e.target.value)}
                            placeholder="Søk på beskrivelse, kategori, event eller medlem"
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                        <select
                            value={listCategory}
                            onChange={(e) => setListCategory(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        >
                            <option value="ALL">Alle kategorier</option>
                            {CATEGORIES.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </div>

                    <div className="max-h-[900px] overflow-y-auto p-3 space-y-2">
                        {loadingList && displayedExpenses.length === 0 ? (
                            <LoadingState className="h-40" spinnerSizeClassName="h-7 w-7" />
                        ) : displayedExpenses.length === 0 ? (
                            <div className="text-center py-16 text-gray-500">
                                <p className="font-medium">Ingen utgifter funnet.</p>
                                <p className="text-xs mt-1">Prøv andre filtre eller opprett en ny utgift.</p>
                            </div>
                        ) : (
                            displayedExpenses.map((expense) => {
                                const isEditing = editingExpenseId === expense.id;
                                const isDeleting = deletingId === expense.id;

                                return (
                                    <article
                                        key={expense.id}
                                        className={`rounded-xl border p-3 transition-colors ${isEditing
                                            ? "border-indigo-300 bg-indigo-50/40"
                                            : "border-gray-200 bg-white hover:border-indigo-200"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{expense.description}</p>
                                                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                                        {expense.category}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                                                    <span>{formatDate(expense.date)}</span>
                                                    {expense.eventTitle && <span>Event: {expense.eventTitle}</span>}
                                                    {expense.splitCount > 0 ? (
                                                        <span>{expense.splitCount} medlemmer</span>
                                                    ) : (
                                                        <span>Felles utgift</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-sm font-bold text-gray-900">{formatCurrency(expense.totalAmount)}</p>
                                                <p className="text-[10px] text-gray-500">{expense.transactionIds.length} transaksjoner</p>
                                            </div>
                                        </div>

                                        {expense.members.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {expense.members.slice(0, 3).map((member) => (
                                                    <span
                                                        key={member.id}
                                                        className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border border-indigo-100 bg-indigo-50 text-indigo-700"
                                                    >
                                                        {member.name}
                                                    </span>
                                                ))}
                                                {expense.members.length > 3 && (
                                                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border border-gray-200 bg-gray-50 text-gray-600">
                                                        +{expense.members.length - 3} flere
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-3 flex items-center justify-between">
                                            <div className="text-[10px] text-gray-500">
                                                {expense.receiptUrl ? "Har kvittering" : "Ingen kvittering"}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => startEditingExpense(expense)}
                                                    className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100"
                                                >
                                                    Rediger
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteExpense(expense)}
                                                    disabled={isDeleting}
                                                    className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                                >
                                                    {isDeleting ? "Sletter..." : "Slett"}
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })
                        )}

                        {loadingList && displayedExpenses.length > 0 && (
                            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-xs font-medium text-indigo-700">
                                Oppdaterer liste...
                            </div>
                        )}

                        {hasMoreExpenses && (
                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={handleLoadMore}
                                    disabled={loadingMore || loadingList}
                                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                                >
                                    {loadingMore ? "Laster flere..." : "Last flere utgifter"}
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
