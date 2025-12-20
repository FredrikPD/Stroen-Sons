import { db } from "@/server/db";
import UserManagementClient from "./user-management-client";
import { Role } from "@prisma/client";

export default async function UserManagementPage() {
    // Parallel data fetching for stats and members
    const [
        totalMembers,
        adminCount,
        studentCount,
        pendingCount,
        allMembers
    ] = await Promise.all([
        db.member.count(),
        db.member.count({ where: { role: "ADMIN" } }),
        db.member.count({ where: { membershipType: "STUDENT" } }), // Assuming STUDENT is a valid membershipType or just placeholder logic
        db.member.count({ where: { membershipType: "TRIAL" } }), // Using TRIAL as pending/applications proxy
        db.member.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                membershipType: true,
                createdAt: true, // Used to calc approximate "last active" if not tracking activity
                updatedAt: true,
            }
        })
    ]);

    // Format members for the client component
    const formattedMembers = allMembers.map(m => {
        // Simple heuristic for "Last Active" - using updatedAt
        const diffInSeconds = Math.floor((new Date().getTime() - new Date(m.updatedAt).getTime()) / 1000);
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
            membershipType: m.membershipType,
            status: "Aktiv", // Defaulting to active as per plan
            lastActive: lastActive,
            avatarInitial: (m.firstName?.[0] || m.email[0]).toUpperCase()
        };
    });

    const stats = [
        {
            title: "Totalt Medlemmer",
            value: totalMembers,
            icon: "groups",
            colorClass: "text-blue-500 bg-blue-50",
            iconColor: "text-blue-500"
        },
        {
            title: "Administratorer",
            value: adminCount,
            icon: "admin_panel_settings", // verifiedish
            colorClass: "text-purple-500 bg-purple-50",
            iconColor: "text-purple-500"
        },
        {
            title: "Ventende",
            value: pendingCount,
            suffix: "søknader",
            icon: "hourglass_top",
            colorClass: "text-yellow-500 bg-yellow-50",
            iconColor: "text-yellow-500"
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
                    <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col justify-between h-[120px] shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <span className="material-symbols-outlined text-6xl">{stat.icon}</span>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${stat.colorClass} bg-opacity-50`}>
                                <span className={`material-symbols-outlined text-lg ${stat.iconColor}`}>{stat.icon}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.title}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
                            {stat.suffix && <span className="text-xs text-gray-500 font-medium">{stat.suffix}</span>}
                        </div>
                    </div>
                ))}
            </div>

            <UserManagementClient members={formattedMembers} />
        </div>
    );
}
