import { db, ACTIVE_MEMBER_FILTER } from "@/server/db";
import DeleteUserClient from "./delete-user-client";
import { SetHeader } from "@/components/layout/SetHeader";
import { ensureRole } from "@/server/auth/ensureRole";
import { Role } from "@prisma/client";

export const metadata = {
    title: "Slett Brukere",
};

export default async function DeleteUserPage() {
    await ensureRole([Role.ADMIN]);

    const members = await db.member.findMany({
        where: { ...ACTIVE_MEMBER_FILTER },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            email: true,
            role: true,
            clerkId: true,
            createdAt: true,
            phoneNumber: true,
            balance: true,
            _count: {
                select: {
                    eventsAttending: true,
                }
            }
        },
        orderBy: { firstName: 'asc' }
    });

    const formattedMembers = members.map(member => ({
        ...member,
        balance: member.balance.toNumber(),
        _count: (member as any)._count,
    }));

    return (
        <div className="min-h-[80vh] flex flex-col p-4">
            <SetHeader backHref="/admin/users" backLabel="Brukere" />
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Slett Medlem</h1>
                <p className="text-gray-500 mt-2">Deaktiver medlemmer og anonymiser personlig data. Navnet beholdes i historikk.</p>
            </div>
            <DeleteUserClient initialMembers={formattedMembers} />
        </div>
    );
}
