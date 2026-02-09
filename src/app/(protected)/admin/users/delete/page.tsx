"use server";

import { db } from "@/server/db";
import DeleteUserClient from "./delete-user-client";

export const metadata = {
    title: "Slett Brukere",
};

export default async function DeleteUserPage() {
    const members = await db.member.findMany({
        select: {
            id: true,
            firstName: true,
            lastName: true,
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
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Slett Medlem</h1>
                <p className="text-gray-500 mt-2">Søk opp og slett medlemmer permanent. Vær forsiktig.</p>
            </div>
            <DeleteUserClient initialMembers={formattedMembers} />
        </div>
    );
}
