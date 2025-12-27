"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createEvent } from "@/server/actions/events";
import { UploadDropzone } from "@/utils/uploadthing";
import { toast } from "sonner";

const createEventSchema = z.object({
    title: z.string().min(1, "Tittel er påkrevd"),
    description: z.string().optional(),
    startAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: "Ugyldig dato",
    }),
    location: z.string().optional(),
    address: z.string().optional(),
    coverImage: z.string().optional(),
    totalCost: z.coerce.number().min(0).optional(),
    clubSubsidy: z.coerce.number().min(0).optional(),
    program: z.array(z.object({
        time: z.string().min(1, "Tidspunkt er påkrevd"),
        title: z.string().min(1, "Tittel er påkrevd"),
        description: z.string().optional(),
    })).optional(),
});

type FormData = z.infer<typeof createEventSchema>;

export default function CreateEventPage() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadedCoverImage, setUploadedCoverImage] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(createEventSchema),
        defaultValues: {
            totalCost: 0,
            clubSubsidy: 0,
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "program",
    });

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        try {
            const result = await createEvent({
                ...data,
                startAt: new Date(data.startAt),
                coverImage: uploadedCoverImage || undefined,
            });

            if (result.success) {
                toast.success("Arrangement opprettet!");
                router.push("/admin");
            } else {
                toast.error(result.error || "Noe gikk galt");
            }
        } catch (error) {
            toast.error("Kunne ikke opprette arrangement");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <Link
                    href="/admin"
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Nytt Arrangement</h1>
                    <p className="text-gray-500 text-sm">Fyll inn detaljene for det nye arrangementet.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Main Content & Sidebar Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Main Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Event Details Card */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#4F46E5]">article</span>
                                Generell Informasjon
                            </h2>

                            <div className="space-y-4">
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
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Beskrivelse</label>
                                    <textarea
                                        {...register("description")}
                                        rows={6}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none text-gray-900 placeholder:text-gray-400 resize-none"
                                        placeholder="Hva handler arrangementet om?"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location & Time Card */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#4F46E5]">location_on</span>
                                Tid og Sted
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse</label>
                                    <input
                                        {...register("address")}
                                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] transition-all outline-none text-gray-900 placeholder:text-gray-400"
                                        placeholder="Gateadresse 123, 0000 Sted"
                                    />
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
                                <UploadDropzone
                                    endpoint="coverImage"
                                    onClientUploadComplete={(res) => {
                                        if (res && res[0]) {
                                            setUploadedCoverImage(res[0].url);
                                            toast.success("Bilde lastet opp!");
                                        }
                                    }}
                                    onUploadError={(error: Error) => {
                                        toast.error(`Feil ved opplasting: ${error.message}`);
                                    }}
                                    appearance={{
                                        container: "border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors h-48",
                                        label: "text-gray-500 text-sm",
                                        button: "bg-[#4F46E5] text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#4338ca] transition-colors",
                                        allowedContent: "text-xs text-gray-400"
                                    }}
                                    content={{
                                        label: "Last opp coverbilde",
                                        button: "Velg fil",
                                        allowedContent: "Bilde opp til 4MB"
                                    }}
                                />
                            )}
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
                                Oppretter...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">add_circle</span>
                                Opprett Arrangement
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
