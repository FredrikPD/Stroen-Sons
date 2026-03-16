import { getMembers } from "@/server/actions/members";
import { Metadata } from "next";
import { Avatar } from "@/components/Avatar";
import { ensureMember } from "@/server/auth/ensureMember";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Medlemmer",
    description: "Oversikt over alle medlemmer i Strøen Søns",
};

function MemberCard({ member }: { member: any }) {
    const isAdmin = member.role === "ADMIN";
    const fullName = [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email;
    const joinedDate = new Date(member.createdAt).toLocaleDateString("nb-NO", { month: "short", year: "numeric" });

    return (
        <div className="group bg-white rounded-2xl border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all overflow-hidden flex flex-col">
            {/* Avatar + name */}
            <div className="flex flex-col items-center gap-3 pt-6 pb-5 px-4 border-b border-gray-100">
                <Avatar
                    src={member.avatarUrl ?? null}
                    initials={`${member.firstName?.[0] || ""}${member.lastName?.[0] || ""}`}
                    size="lg"
                    alt={fullName}
                />
                <div className="text-center min-w-0 w-full">
                    <h3
                        className="font-normal text-base text-gray-900 leading-snug truncate"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        {fullName}
                    </h3>
                    <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 inline-block ${
                        isAdmin ? "text-gray-900" : "text-gray-400"
                    }`}>
                        {isAdmin ? "Admin" : "Medlem"}
                    </span>
                </div>
            </div>

            {/* Details */}
            <div className="px-4 py-3.5 flex flex-col gap-1.5 flex-1">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[13px] text-gray-300 shrink-0">mail</span>
                    <span className="text-xs text-gray-400 truncate">{member.email}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[13px] text-gray-300 shrink-0">call</span>
                    <span className="text-xs text-gray-400">
                        {member.phoneNumber ?? <span className="italic text-gray-300">—</span>}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[13px] text-gray-300 shrink-0">location_on</span>
                    <span className="text-xs text-gray-400 truncate">
                        {member.city ?? <span className="italic text-gray-300">—</span>}
                    </span>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-gray-300">Siden</span>
                <span className="text-[10px] font-bold text-gray-400 tabular-nums">{joinedDate}</span>
            </div>
        </div>
    );
}

export default async function MembersPage() {
    try {
        await ensureMember();
    } catch {
        redirect("/sign-in");
    }

    const { data: members, success } = await getMembers();

    if (!success || !members) {
        return (
            <div className="text-center py-8 rounded-xl border border-dashed border-gray-200">
                <p className="text-xs text-gray-400 italic" style={{ fontFamily: "'Georgia', serif" }}>
                    Kunne ikke laste inn medlemmer.
                </p>
            </div>
        );
    }

    const admins = members.filter(m => m.role === "ADMIN");
    const regularMembers = members.filter(m => m.role !== "ADMIN");

    return (
        <div className="flex flex-col gap-8 min-w-0 overflow-x-hidden">

            {/* ── Page Header ─────────────────────────────────────────── */}
            <div className="flex items-end justify-between gap-4 pt-1">
                <div>
                    <h1
                        className="text-3xl sm:text-4xl font-normal text-gray-900 leading-none"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                    >
                        <em>Medlemmer</em>
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <div className="h-px w-8 bg-gray-300" />
                        <p className="text-[11px] text-gray-400 italic" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                            Brødrene i Strøen Søns
                        </p>
                    </div>
                </div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest shrink-0 hidden sm:block">
                    {members.length} medlemmer
                </p>
            </div>

            {/* ── Stats bar ───────────────────────────────────────────── */}
            <div
                className="rounded-2xl p-5 grid grid-cols-3 divide-x divide-white/10"
                style={{ background: "linear-gradient(145deg, #1a1a1a 0%, #111111 100%)", boxShadow: "0 4px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)" }}
            >
                <div className="pr-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-gray-500 mb-1">Totalt</p>
                    <p className="font-bold text-gray-100 text-2xl leading-none" style={{ fontFamily: "'Georgia', serif" }}>
                        {members.length}
                    </p>
                </div>
                <div className="px-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-gray-500 mb-1 truncate">Administratorer</p>
                    <p className="font-bold text-gray-100 text-2xl leading-none" style={{ fontFamily: "'Georgia', serif" }}>
                        {admins.length}
                    </p>
                </div>
                <div className="pl-4">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-gray-500 mb-1">Medlemmer</p>
                    <p className="font-bold text-gray-100 text-2xl leading-none" style={{ fontFamily: "'Georgia', serif" }}>
                        {regularMembers.length}
                    </p>
                </div>
            </div>

            {/* ── Members ─────────────────────────────────────────────── */}
            {members.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Medlemmer</span>
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-[9px] font-bold text-gray-300 uppercase tracking-wider">{regularMembers.length}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {members.map(member => <MemberCard key={member.id} member={member} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
