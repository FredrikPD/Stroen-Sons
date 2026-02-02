import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/server/db";
import { updateEvent } from "@/server/actions/events";
import { EventForm } from "@/components/events/EventForm";
import { EventInput } from "@/lib/validators/events";

interface EditEventPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function EditEventPage({ params }: EditEventPageProps) {
    const { id } = await params;
    const event = await db.event.findUnique({
        where: { id },
        include: {
            program: {
                orderBy: {
                    order: "asc",
                },
            },
        },
    });

    // @ts-ignore - Prisma include types are correct at runtime
    const eventWithRelations = event as any;

    if (!event) {
        notFound();
    }

    const handleSubmit = async (data: EventInput) => {
        "use server";
        const result = await updateEvent(id, data);
        if (result.success) {
            redirect("/admin/events");
        }
        return result;
    };

    // Prepare initial data
    const initialData: Partial<EventInput> = {
        title: event.title,
        description: event.description || "",
        startAt: event.startAt,
        location: event.location || "",
        address: event.address || "",
        coverImage: event.coverImage || undefined,
        totalCost: event.totalCost || 0,
        clubSubsidy: event.clubSubsidy || 0,
        program: eventWithRelations.program.map((p: any) => ({
            time: p.time,
            title: p.title,
            description: p.description || "",
        })),
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
                <Link
                    href="/admin/events"
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Rediger Arrangement</h1>
                    <p className="text-gray-500 text-sm">Endre informasjonen for dette arrangementet.</p>
                </div>
            </div>

            <EventForm
                initialData={initialData}
                onSubmit={handleSubmit}
                submitButtonText="Lagre Endringer"
                isEditMode
            />
        </div>
    );
}
