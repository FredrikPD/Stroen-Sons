"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { Resend } from "resend";
import { UTApi } from "uploadthing/server";
import { ensureMember } from "@/server/auth/ensureMember";

export interface SystemStats {
    clerk: {
        totalUsers: number;
    };
    prisma: {
        apiConnection: string; // "Connected" | "Configured (Invalid)" | "Missing"
        metrics: {
            totalOperations: number;
        };
    };
    uploadThing: {
        fileCount: number | null;
        totalUsage: string | null; // Formatted string e.g. "1.5 GB"
        usagePercentage: number | null;
        recentFiles: Array<{
            id: string;
            name: string;
            size: number;
            key: string;
            status: string;
            uploadedAt?: number;
        }>;
    };
    resend: {
        domainStatus: string | null;
        sentEmailsLast30Days: number | null; // Keeping structure but unused for now
        recentEmails: Array<{
            id: string;
            to: string;
            subject: string;
            status: string;
            created_at: string;
        }>;
    };
}

// Helper function for formatting bytes
function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export async function getSystemStats(): Promise<{ success: boolean; data?: SystemStats; error?: string }> {
    try {
        const member = await ensureMember();
        if (member.role !== "ADMIN") return { success: false, error: "Unauthorized" };

        // 1. Clerk Stats
        const clerk = await clerkClient();
        const clerkUserCount = await clerk.users.getCount();

        // 2. Prisma Stats (Metrics Only)
        // Fetch Prisma Metrics (via Management API)
        let prismaMetricsData = {
            totalOperations: 0,
        };
        let prismaApiStatus = "Missing Token";

        try {
            const mgmtToken = process.env.PRISMA_MGMT_TOKEN;
            const dbId = process.env.PRISMA_DATABASE_ID;

            if (mgmtToken && dbId) {
                // Fetch Usage Metrics from Management API
                const start = new Date();
                start.setDate(start.getDate() - 30); // Last 30 days

                // Endpoint: https://api.prisma.io/v1/databases/{id}/usage
                const usageRes = await fetch(`https://api.prisma.io/v1/databases/${dbId}/usage?start=${start.toISOString()}`, {
                    headers: { 'Authorization': `Bearer ${mgmtToken}` },
                    next: { revalidate: 60 } // Cache for 60 seconds
                });

                if (usageRes.ok) {
                    const usageData = await usageRes.json();
                    prismaApiStatus = "Connected";

                    if (usageData.metrics?.operations) {
                        prismaMetricsData.totalOperations = usageData.metrics.operations.used || 0;
                    }

                } else {
                    prismaApiStatus = "Error: " + usageRes.status;
                    if (usageRes.status === 401 || usageRes.status === 403) {
                        prismaApiStatus = "Invalid Token";
                    }
                }
            }

            // Fallback: Local Metrics Check
            if ('$metrics' in db && prismaMetricsData.totalOperations === 0) {
                const metrics = await (db as any).$metrics.json();
                if (metrics) {
                    const totalOps = metrics.counters?.find((m: any) => m.key === 'query_total_count')?.value || 0;
                    prismaMetricsData.totalOperations = totalOps;
                }
            }

        } catch (e) {
            console.warn("Could not fetch Prisma metrics:", e);
            prismaApiStatus = "Error";
        }

        // 3. UploadThing Stats
        const utapi = new UTApi();
        let uploadThingStats = {
            fileCount: null as number | null,
            totalUsage: null as string | null,
            usagePercentage: null as number | null,
            recentFiles: [] as any[]
        };

        try {
            const utFiles = await utapi.listFiles({ limit: 5 });
            const usageInfo = await utapi.getUsageInfo();

            uploadThingStats.recentFiles = utFiles.files.map(f => ({
                id: f.id || f.key, // Fallback
                name: f.name,
                size: f.size,
                key: f.key,
                status: f.status,
                uploadedAt: new Date(f.uploadedAt).getTime()
            }));

            uploadThingStats.fileCount = usageInfo.filesUploaded;
            uploadThingStats.totalUsage = formatBytes(usageInfo.totalBytes);
            const limit = 1024 * 1024 * 1024; // 1GB
            uploadThingStats.usagePercentage = Math.round((usageInfo.totalBytes / limit) * 100);

        } catch (error) {
            console.warn("Failed to fetch UploadThing stats:", error);
        }

        // 4. Resend Stats
        const resend = new Resend(process.env.RESEND_API_KEY);
        let resendStats = {
            domainStatus: "Unknown",
            sentEmailsLast30Days: 0,
            recentEmails: [] as any[]
        };

        try {
            if (process.env.RESEND_API_KEY) {
                // Check domains/connection
                const domains = await resend.domains.list();
                if (domains.error && domains.error.name === 'restricted_api_key') {
                    resendStats.domainStatus = "Connected (Sending Only)";
                } else if (domains.data && Array.isArray(domains.data) && domains.data.length > 0) {
                    resendStats.domainStatus = "Connected";
                } else {
                    resendStats.domainStatus = "Configured (No Domains/Access)";
                }

                // Fetch Recent Emails (Limit 5)
                // Note: The API Key might be restricted to 'sending only', which causes a 401 error for listing.
                const emailsResponse = await resend.emails.list({ limit: 5 });

                if (emailsResponse.error) {
                    if (emailsResponse.error.name === 'restricted_api_key') {
                        resendStats.domainStatus = "Connected (Sending Only)";
                    } else {
                        console.warn("Resend list error:", emailsResponse.error);
                    }
                } else if (emailsResponse.data) {
                    // Fix: The response structure is likely { data: { data: [...] } } or similar depending on version.
                    // Checking if data is array or wrapped object.
                    const emailList = Array.isArray(emailsResponse.data) ? emailsResponse.data : (emailsResponse.data as any).data;

                    if (Array.isArray(emailList)) {
                        resendStats.recentEmails = emailList.map((email: any) => ({
                            id: email.id,
                            to: email.to,
                            subject: email.subject,
                            status: "sent",
                            created_at: email.created_at
                        }));
                    }
                }
            } else {
                resendStats.domainStatus = "Missing API Key";
            }
        } catch (e) {
            console.warn("Resend check failed:", e);
            resendStats.domainStatus = "Error";
        }


        return {
            success: true,
            data: {
                clerk: {
                    totalUsers: clerkUserCount,
                },
                prisma: {
                    apiConnection: prismaApiStatus,
                    metrics: prismaMetricsData
                },
                uploadThing: uploadThingStats,
                resend: resendStats
            }
        };

    } catch (error) {
        console.error("Failed to get system stats:", error);
        return { success: false, error: "Failed to fetch system stats" };
    }
}
