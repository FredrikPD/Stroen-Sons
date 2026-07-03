import { db, ACTIVE_MEMBER_FILTER } from "@/server/db";
import UserManagementClient from "./user-management-client";
import { SetHeader } from "@/components/layout/SetHeader";
import { Role } from "@prisma/client";
import { ensureRole } from "@/server/auth/ensureRole";
import { AdminHero } from "@/components/admin/ui";

export const metadata = {
    title: "Administrer Brukere",
};

export default async function UserManagementPage() {
    await ensureRole([Role.ADMIN]);

    const [
        totalMembers,
        adminCount,
        studentCount,
        pendingCount,
        allMembers,
        availableRoles
    ] = await Promise.all([
        db.member.count({ where: { ...ACTIVE_MEMBER_FILTER } }),
        db.member.count({ where: { ...ACTIVE_MEMBER_FILTER, role: "ADMIN" } }),
        db.member.count({ where: { ...ACTIVE_MEMBER_FILTER, membershipType: "STUDENT" } }), db.member.count({ where: { ...ACTIVE_MEMBER_FILTER, status: "PENDING" } }),
        db.member.findMany({
            where: { ...ACTIVE_MEMBER_FILTER },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                email: true,
                role: true,
                userRole: { select: { id: true, name: true } },
                membershipType: true,
                status: true,
                createdAt: true, // Used to calc approximate "last active" if not tracking activity
                updatedAt: true,
                lastActiveAt: true,
            }
        }),
        db.userRole.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
    ]);

    // Format members for the client component
    const formattedMembers = allMembers.map((m: any) => {
        // Calculate "Last Active"
        const lastActiveDate = m.lastActiveAt || m.updatedAt;
        const diffInSeconds = Math.floor((new Date().getTime() - new Date(lastActiveDate).getTime()) / 1000);
        let lastActive = "Nylig";
        if (diffInSeconds < 60) lastActive = "Akkurat nå";
        else if (diffInSeconds < 3600) lastActive = `${Math.floor(diffInSeconds / 60)} minutter siden`;
        else if (diffInSeconds < 86400) lastActive = `${Math.floor(diffInSeconds / 3600)} timer siden`;
        else lastActive = `${Math.floor(diffInSeconds / 86400)} dager siden`;

        return {
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
            email: m.email,
            role: m.role,
            userRole: m.userRole,
            membershipType: m.membershipType,
            status: m.status === 'ACTIVE' ? "Aktiv" : m.status === 'PENDING' ? "Ventende" : "Inaktiv",
            lastActive: lastActive,
            avatarUrl: m.avatarUrl ?? null
        };
    });

    const stats = [
        {
            icon: "groups",
            label: "Totalt Medlemmer",
            value: totalMembers,
        },
        {
            icon: "admin_panel_settings",
            label: "Administratorer",
            value: adminCount,
        },
        {
            icon: "school",
            label: "Studenter",
            value: studentCount,
        },
        {
            icon: "hourglass_top",
            label: "Ventende",
            value: pendingCount,
            sub: "invitasjoner",
            valueClass: "text-amber-400",
        },
    ];

    return (
        <div className="space-y-8">
            <SetHeader backHref="/admin/dashboard" backLabel="Dashboard" />

            <AdminHero
                eyebrow="Administrasjon"
                title="Brukeradministrasjon"
                subtitle="Administrer medlemmer, tildel roller og hold oversikt over aktivitet i klubben."
                stats={stats}
            />

            <UserManagementClient members={formattedMembers} availableRoles={availableRoles} />
        </div>
    );
}
