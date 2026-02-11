import { getMembers } from "@/server/actions/members";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Medlemmer",
    description: "Oversikt over alle medlemmer i Strøen Søns",
};

function InitialsAvatar({ firstName, lastName, role }: { firstName: string | null; lastName: string | null, role: string }) {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    const isAdmin = role === "ADMIN";

    return (
        <div className="size-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ring-2 ring-white bg-gradient-to-br from-zinc-600 to-zinc-900">
            {first}{last}
        </div>
    );
}

function RoleBadge({ role }: { role: string }) {
    const isadmin = role === "ADMIN";
    return (
        <span
            className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md border shadow-sm ${isadmin
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                }`}
        >
            {role}
        </span>
    );
}

function MemberCard({ member }: { member: any }) {
    const isAdmin = member.role === "ADMIN";

    return (
        <div className="group relative break-inside-avoid">
            <div className="relative flex flex-col gap-4 p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 h-full overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none opacity-40 ${isAdmin
                    ? "from-amber-500/5 via-transparent to-transparent"
                    : "from-indigo-500/5 via-transparent to-transparent"
                    }`} />

                <div className="relative z-10 flex items-start justify-between">
                    <InitialsAvatar firstName={member.firstName} lastName={member.lastName} role={member.role} />
                    <RoleBadge role={member.role} />
                </div>

                <div className="relative z-10">
                    <h3 className={`text-lg font-bold transition-colors ${isAdmin ? "text-gray-900 group-hover:text-amber-700" : "text-gray-900 group-hover:text-indigo-700"}`}>
                        {member.firstName} {member.lastName}
                    </h3>
                    <p className="text-sm text-gray-500">{member.email}</p>

                    <div className="flex flex-col gap-1 mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span className="material-symbols-outlined text-[14px] text-gray-400">call</span>
                            {member.phoneNumber ? (
                                <span>{member.phoneNumber}</span>
                            ) : (
                                <span className="text-gray-400 italic">Ikke registrert</span>
                            )}
                        </div>

                        {(member.address || member.city) ? (
                            <div className="flex items-start gap-2 text-xs text-gray-600">
                                <span className="material-symbols-outlined text-[14px] text-gray-400 mt-0.5">location_on</span>
                                <span className="" title={`${member.address || ''}, ${member.zipCode || ''} ${member.city || ''}`}>
                                    {[member.address, member.zipCode, member.city].filter(Boolean).join(", ")}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                                <span className="material-symbols-outlined text-[14px] text-gray-400">location_on</span>
                                <span className="text-gray-400 italic">Ikke registrert</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`absolute top-28 right-6 opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none z-0`}>
                    <span className="material-symbols-outlined text-6xl text-gray-900">
                        {isAdmin ? "shield_person" : "person"}
                    </span>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 relative z-10">
                    <span>Medlem siden</span>
                    <span className="font-mono text-gray-600 font-medium">
                        {new Date(member.createdAt).toLocaleDateString("no-NO", {
                            year: "numeric",
                            month: "short",
                        })}
                    </span>
                </div>
            </div>
        </div>
    );
}

import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";

export default async function MembersPage() {
    try {
        await ensureMember();
    } catch (e) {
        redirect("/sign-in");
    }

    const { data: members, success } = await getMembers();

    if (!success || !members) {
        return (
            <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow-sm border border-gray-200">
                Kunne ikke laste inn medlemmer.
            </div>
        );
    }

    // Calculate stats
    const totalMembers = members.length;

    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm p-8 lg:p-12 text-center lg:text-left group">
                {/* Decorative background element, similar to cards but larger */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent pointer-events-none" />

                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
                        Medlemmer
                    </h1>
                    <p className="text-lg text-gray-600 leading-relaxed max-w-lg mx-auto lg:mx-0">
                        Aktive medlemmer i Strøen Søns
                    </p>
                </div>

                {/* Stats */}
                <div className="mt-8 lg:mt-0 lg:absolute lg:bottom-12 lg:right-12 flex gap-8 justify-center lg:justify-end relative z-10">
                    <div className="text-center lg:text-right">
                        <p className="text-3xl font-bold text-gray-900">{totalMembers}</p>
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-bold">Medlemmer</p>
                    </div>
                </div>

                <div className="absolute top-1/2 right-0 -translate-y-1/2 opacity-[0.03] pointer-events-none hidden lg:block">
                    <span className="material-symbols-outlined text-[300px]">groups</span>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {members.map((member) => (
                    <MemberCard key={member.id} member={member} />
                ))}
            </div>
        </div>
    );
}
