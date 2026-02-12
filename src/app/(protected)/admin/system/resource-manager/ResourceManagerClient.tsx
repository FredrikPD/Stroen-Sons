"use client";

import { useEffect, useState } from "react";
import { getSystemStats, type SystemStats } from "@/server/actions/system-resources";
import { toast } from "sonner";
import { getCurrentMember } from "@/server/actions/finance";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ResourceManagerClient() {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const member = await getCurrentMember();
            if (!member || member.role !== "ADMIN") {
                router.push("/admin/dashboard");
            }
        };
        checkAuth();
    }, [router]);

    const fetchData = async () => {
        setLoading(true);
        const result = await getSystemStats();
        if (result.success && result.data) {
            setStats(result.data);
        } else {
            toast.error(result.error || "Kunne ikke hente systemdata");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return <LoadingState />;
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">Resource Manager</h1>
                    <p className="text-gray-500 text-sm">Oversikt over systemressurser og integrasjoner.</p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">refresh</span>
                    Oppdater
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* CLERK */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#6C47FF]/5 to-transparent pointer-events-none" />
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#6C47FF]/10 flex items-center justify-center text-[#6C47FF]">
                                <span className="material-symbols-outlined">group</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Clerk Auth</h3>
                                <p className="text-xs text-gray-500">Brukerhåndtering</p>
                            </div>
                        </div>
                        <div className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-wider">
                            Active
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <span className="text-sm text-gray-600">Total Users</span>
                            <span className="text-xl font-bold text-gray-900">{stats?.clerk.totalUsers ?? "-"}</span>
                        </div>

                        <a
                            href="https://dashboard.clerk.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full py-2.5 bg-[#6C47FF] hover:bg-[#5b3adb] text-white rounded-lg font-bold text-xs transition-colors gap-2"
                        >
                            Open Clerk Dashboard
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                    </div>
                </div>

                {/* PRISMA / DATABASE */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent pointer-events-none" />
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600">
                                <span className="material-symbols-outlined">database</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Prisma DB</h3>
                                <p className="text-xs text-gray-500">PostgreSQL (Accelerate)</p>
                            </div>
                        </div>
                        <div className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider ${stats?.prisma.apiConnection === 'Connected' ? 'bg-indigo-600/10 text-indigo-700' :
                            stats?.prisma.apiConnection === 'Invalid Token' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                            {stats?.prisma.apiConnection ?? "Checking..."}
                        </div>
                    </div>

                    {/* Performance Metrics - Only Operations & Link */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <span className="text-sm text-gray-600">Total Operations (30d)</span>
                            <span className="text-xl font-bold text-gray-900">
                                {stats?.prisma.metrics?.totalOperations?.toLocaleString() ?? 0}
                            </span>
                        </div>

                        <a
                            href="https://console.prisma.io/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-colors gap-2"
                        >
                            Open Prisma Dashboard
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                    </div>
                </div>



                {/* UPLOADTHING */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#F87171]/5 to-transparent pointer-events-none" />
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#F87171]/10 flex items-center justify-center text-[#F87171]">
                                <span className="material-symbols-outlined">cloud_upload</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">UploadThing</h3>
                                <p className="text-xs text-gray-500">File Storage</p>
                            </div>
                        </div>
                        <div className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase rounded-full tracking-wider">
                            Connected
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <span className="text-sm text-gray-600">Files Count</span>
                            <span className="text-xl font-bold text-gray-900">{stats?.uploadThing.fileCount !== null ? stats?.uploadThing.fileCount : "N/A"}</span>
                        </div>

                        {stats?.uploadThing.totalUsage && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-500">Usage</span>
                                    <span className="font-bold text-gray-900">{stats.uploadThing.totalUsage}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-[#F87171] h-full rounded-full"
                                        style={{ width: `${stats.uploadThing.usagePercentage ?? 0}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Recent Files Compact List */}
                        <div className="border-t border-gray-100 pt-3">
                            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Recent Uploads</p>
                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {stats?.uploadThing.recentFiles && stats.uploadThing.recentFiles.length > 0 ? (
                                    stats.uploadThing.recentFiles.map((file) => (
                                        <div key={file.id} className="flex items-center justify-between text-xs group/file p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${file.status === 'Uploaded' ? 'bg-green-500' : 'bg-gray-300'
                                                    }`} />
                                                <span className="font-medium text-gray-700 truncate" title={file.name}>
                                                    {file.name}
                                                </span>
                                            </div>
                                            <span className="text-gray-400 font-mono whitespace-nowrap ml-2">
                                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-400 py-2 italic text-center">No recent files</p>
                                )}
                            </div>
                        </div>

                        <a
                            href="https://uploadthing.com/dashboard"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full py-2.5 bg-[#F87171] hover:bg-[#ef4444] text-white rounded-lg font-bold text-xs transition-colors gap-2"
                        >
                            Open UploadThing Dashboard
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                    </div>
                </div>

                {/* RESEND */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 relative overflow-hidden group shadow-sm hover:shadow-md transition-shadow">
                    <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent pointer-events-none" />
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center text-black">
                                <span className="material-symbols-outlined">mail</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Resend</h3>
                                <p className="text-xs text-gray-500">Email Service</p>
                            </div>
                        </div>
                        <div className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider ${stats?.resend.domainStatus?.includes('Connected') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {stats?.resend.domainStatus === "Connected (Sending Only)" ? "Sending Only" : stats?.resend.domainStatus ?? "Checking..."}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Status</p>
                            <p className="text-sm font-medium text-gray-900">{stats?.resend.domainStatus ?? 'Unknown'}</p>
                        </div>

                        {/* Recent Emails Compact List */}
                        <div className="border-t border-gray-100 pt-3">
                            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Recent Emails</p>
                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {stats?.resend.domainStatus === "Connected (Sending Only)" ? (
                                    <div className="text-center py-3 bg-yellow-50 rounded-lg border border-yellow-100">
                                        <p className="text-xs text-yellow-800 font-medium">Restricted API Key</p>
                                        <p className="text-[10px] text-yellow-600 mt-1 px-2">
                                            Your API key is configured for <strong>sending only</strong>.
                                            To view email history, please visit the dashboard.
                                        </p>
                                    </div>
                                ) : stats?.resend.recentEmails && stats.resend.recentEmails.length > 0 ? (
                                    stats.resend.recentEmails.map((email) => (
                                        <div key={email.id} className="flex items-center justify-between text-xs group/email p-2 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-green-500" />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-medium text-gray-700 truncate" title={email.subject}>
                                                        {email.subject || '(No Subject)'}
                                                    </span>
                                                    <span className="text-gray-400 text-[10px] truncate">
                                                        to: {Array.isArray(email.to) ? email.to[0] : email.to}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-gray-400 font-mono whitespace-nowrap ml-2 text-[10px]">
                                                {new Date(email.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-gray-400 py-2 italic text-center">No recent emails</p>
                                )}
                            </div>
                        </div>

                        <a
                            href="https://resend.com/overview"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-full py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg font-bold text-xs transition-colors gap-2"
                        >
                            Open Resend Dashboard
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
}
