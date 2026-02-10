import { db } from "@/server/db";
import UserManagementClient from "./user-management-client";
import { Role } from "@prisma/client";
import { ensureRole } from "@/server/auth/ensureRole";

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
        db.member.count(),
        db.member.count({ where: { role: "ADMIN" } }),
        db.member.count({ where: { membershipType: "STUDENT" } }), db.member.count({ where: { status: "PENDING" } }),
        db.member.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
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
            avatarInitial: (m.firstName?.[0] || m.email[0]).toUpperCase()
        };
    });

    const stats = [
        {
            title: "Totalt Medlemmer",
            value: totalMembers,
            icon: "groups",
            colorName: "indigo-500", // For text-indigo-500 and from-indigo-500
            gradientFrom: "from-indigo-500/5"
        },
        {
            title: "Administratorer",
            value: adminCount,
            icon: "admin_panel_settings",
            colorName: "purple-500",
            gradientFrom: "from-purple-500/5"
        },
        {
            title: "Ventende",
            value: pendingCount,
            suffix: "invitasjoner",
            icon: "hourglass_top",
            colorName: "amber-500",
            gradientFrom: "from-amber-500/5"
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Brukeradministrasjon</h1>
                <p className="text-gray-500 mt-2">Administrer medlemmer, tildel roller og hold oversikt over aktivitet i klubben.</p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between h-[120px] relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                        <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradientFrom} to-transparent pointer-events-none`} />
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`material-symbols-outlined text-${stat.colorName} text-lg`}>{stat.icon}</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{stat.title}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
                            {stat.suffix && <span className="text-xs text-gray-500 font-medium">{stat.suffix}</span>}
                        </div>
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity">
                            <span className={`material-symbols-outlined text-7xl text-${stat.colorName}`}>{stat.icon}</span>
                        </div>
                    </div>
                ))}
            </div>

            <UserManagementClient members={formattedMembers} availableRoles={availableRoles} />
        </div>
    );
}
