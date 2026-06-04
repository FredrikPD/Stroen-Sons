import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { dec, makeMember, makeTransaction } from "../../helpers/fixtures";
import { authMock, ensureMemberMock, loginAsAdmin, loginAsMember } from "../../helpers/auth";

// Shared mock fns are defined via vi.hoisted so the (hoisted) vi.mock factories can close over them.
const {
    utDeleteFiles,
    utListFiles,
    utGetUsageInfo,
    resendDomainsList,
    resendEmailsList,
    checkAccessMock
} = vi.hoisted(() => ({
    utDeleteFiles: vi.fn(async () => ({ success: true })),
    utListFiles: vi.fn(async () => ({ files: [] as unknown[] })),
    utGetUsageInfo: vi.fn(async () => ({
        totalBytes: 0,
        appTotalBytes: 0,
        filesUploaded: 0,
        limitBytes: 0
    })),
    resendDomainsList: vi.fn(async () => ({ data: [], error: null })),
    resendEmailsList: vi.fn(async () => ({ data: [], error: null })),
    checkAccessMock: vi.fn(() => false)
}));

// --- uploadthing/server: a stable shared UTApi mock so we can assert/override per test ---
vi.mock("uploadthing/server", () => ({
    UTApi: vi.fn(() => ({
        deleteFiles: utDeleteFiles,
        listFiles: utListFiles,
        getUsageInfo: utGetUsageInfo
    }))
}));

// --- resend: shared mock with the surface getSystemStats uses (domains.list, emails.list) ---
vi.mock("resend", () => ({
    Resend: vi.fn(() => ({
        domains: { list: resendDomainsList },
        emails: {
            list: resendEmailsList,
            send: vi.fn(async () => ({ data: { id: "e" }, error: null }))
        }
    }))
}));

// --- checkAccess: real module would consult role.allowedPaths; mock for deterministic guard tests ---
vi.mock("@/server/auth/checkAccess", () => ({
    checkAccess: (...args: unknown[]) => checkAccessMock(...args)
}));

import { getSystemStats } from "@/server/actions/system-resources";
import {
    getRecentEvents,
    getRecentPhotos,
    deletePhoto,
    deletePhotos,
    getStorageStats
} from "@/server/actions/admin-photos";
import { getFinancialReport } from "@/server/actions/reports";
import { deleteFile, getRecentFiles } from "@/server/actions/files";
import { clerkClient } from "@clerk/nextjs/server";

const clerkClientMock = vi.mocked(clerkClient);

/** Build a clerkClient whose users.getCount resolves to the given number. */
function setClerkUserCount(count: number) {
    clerkClientMock.mockResolvedValue({
        users: { getCount: vi.fn(async () => count) }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
    // Reset shared UTApi mocks to safe defaults.
    utDeleteFiles.mockReset().mockResolvedValue({ success: true } as never);
    utListFiles.mockReset().mockResolvedValue({ files: [] } as never);
    utGetUsageInfo.mockReset().mockResolvedValue({
        totalBytes: 0,
        appTotalBytes: 0,
        filesUploaded: 0,
        limitBytes: 0
    } as never);

    resendDomainsList.mockReset().mockResolvedValue({ data: [], error: null } as never);
    resendEmailsList.mockReset().mockResolvedValue({ data: [], error: null } as never);

    checkAccessMock.mockReset().mockReturnValue(false);

    // Clean env each test; system-resources reads several optional vars.
    delete process.env.PRISMA_MGMT_TOKEN;
    delete process.env.PRISMA_DATABASE_ID;
    delete process.env.RESEND_API_KEY;
});

afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
});

// =====================================================================================
// system-resources.ts — getSystemStats
// =====================================================================================
describe("getSystemStats", () => {
    beforeEach(() => {
        // Default authenticated admin via ensureMember.
        ensureMemberMock.mockResolvedValue(makeMember({ role: "ADMIN" }) as never);
        setClerkUserCount(42);
    });

    it("rejects a non-admin member", async () => {
        ensureMemberMock.mockResolvedValue(makeMember({ role: "MEMBER" }) as never);
        const res = await getSystemStats();
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("rejects a moderator (only ADMIN allowed)", async () => {
        ensureMemberMock.mockResolvedValue(makeMember({ role: "MODERATOR" }) as never);
        const res = await getSystemStats();
        expect(res).toEqual({ success: false, error: "Unauthorized" });
    });

    it("returns failure when ensureMember throws (unauthenticated)", async () => {
        ensureMemberMock.mockRejectedValue(new Error("Unauthorized"));
        const res = await getSystemStats();
        expect(res).toEqual({ success: false, error: "Failed to fetch system stats" });
    });

    it("aggregates clerk user count, prisma status, uploadthing and resend stats for an admin", async () => {
        utListFiles.mockResolvedValue({
            files: [
                {
                    id: "f1",
                    key: "k1",
                    name: "photo.jpg",
                    size: 2048,
                    status: "Uploaded",
                    uploadedAt: "2026-06-01T00:00:00.000Z"
                }
            ]
        } as never);
        utGetUsageInfo.mockResolvedValue({
            totalBytes: 1024 * 1024 * 1024 * 0.5, // 0.5 GB
            appTotalBytes: 0,
            filesUploaded: 7,
            limitBytes: 1024 * 1024 * 1024
        } as never);

        process.env.RESEND_API_KEY = "re_test";
        resendDomainsList.mockResolvedValue({
            data: [{ name: "stroen.no" }],
            error: null
        } as never);
        resendEmailsList.mockResolvedValue({
            data: [
                { id: "em1", to: "a@b.no", subject: "Hei", created_at: "2026-06-02T00:00:00.000Z" }
            ],
            error: null
        } as never);

        const res = await getSystemStats();

        expect(res.success).toBe(true);
        expect(res.data?.clerk.totalUsers).toBe(42);
        // No mgmt token configured -> status stays "Missing Token".
        expect(res.data?.prisma.apiConnection).toBe("Missing Token");
        expect(res.data?.uploadThing.fileCount).toBe(7);
        expect(res.data?.uploadThing.totalUsage).toBe("512 MB");
        expect(res.data?.uploadThing.usagePercentage).toBe(50);
        expect(res.data?.uploadThing.recentFiles).toHaveLength(1);
        expect(res.data?.uploadThing.recentFiles[0]).toMatchObject({ key: "k1", name: "photo.jpg" });
        expect(res.data?.resend.domainStatus).toBe("Connected");
        expect(res.data?.resend.recentEmails).toEqual([
            { id: "em1", to: "a@b.no", subject: "Hei", status: "sent", created_at: "2026-06-02T00:00:00.000Z" }
        ]);
    });

    it("reports a missing Resend API key as 'Missing API Key'", async () => {
        const res = await getSystemStats();
        expect(res.success).toBe(true);
        expect(res.data?.resend.domainStatus).toBe("Missing API Key");
    });

    it("flags a restricted Resend API key as sending-only", async () => {
        process.env.RESEND_API_KEY = "re_restricted";
        resendDomainsList.mockResolvedValue({
            data: null,
            error: { name: "restricted_api_key" }
        } as never);
        const res = await getSystemStats();
        expect(res.success).toBe(true);
        expect(res.data?.resend.domainStatus).toBe("Connected (Sending Only)");
    });

    it("degrades gracefully when UploadThing throws (stats stay null)", async () => {
        utListFiles.mockRejectedValue(new Error("UT down"));
        const res = await getSystemStats();
        expect(res.success).toBe(true);
        expect(res.data?.uploadThing.fileCount).toBeNull();
        expect(res.data?.uploadThing.totalUsage).toBeNull();
        expect(res.data?.uploadThing.recentFiles).toEqual([]);
    });

    it("marks prisma as Connected and reads operations when the management API succeeds", async () => {
        process.env.PRISMA_MGMT_TOKEN = "mgmt";
        process.env.PRISMA_DATABASE_ID = "db_123";
        const fetchMock = vi.fn(async () => ({
            ok: true,
            status: 200,
            json: async () => ({ metrics: { operations: { used: 9001 } } })
        }));
        vi.stubGlobal("fetch", fetchMock);

        const res = await getSystemStats();

        expect(fetchMock).toHaveBeenCalled();
        expect(res.success).toBe(true);
        expect(res.data?.prisma.apiConnection).toBe("Connected");
        expect(res.data?.prisma.metrics.totalOperations).toBe(9001);
    });

    it("maps a 401 from the management API to 'Invalid Token'", async () => {
        process.env.PRISMA_MGMT_TOKEN = "mgmt";
        process.env.PRISMA_DATABASE_ID = "db_123";
        const fetchMock = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
        vi.stubGlobal("fetch", fetchMock);

        const res = await getSystemStats();
        expect(res.success).toBe(true);
        expect(res.data?.prisma.apiConnection).toBe("Invalid Token");
    });
});

// =====================================================================================
// admin-photos.ts — getRecentEvents, getRecentPhotos, deletePhoto, deletePhotos, getStorageStats
// =====================================================================================
describe("admin-photos auth guards (shared across reads/deletes)", () => {
    it("getRecentEvents throws when unauthenticated (no clerk userId)", async () => {
        authMock.mockResolvedValue({ userId: null } as never);
        await expect(getRecentEvents()).rejects.toThrow("Unauthorized");
    });

    it("getRecentPhotos throws for a plain MEMBER without dynamic access", async () => {
        authMock.mockResolvedValue({ userId: "clerk_user_1" } as never);
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ role: "MEMBER", userRole: null }) as never
        );
        await expect(getRecentPhotos()).rejects.toThrow("Unauthorized");
    });

    it("deletePhotos throws for a member whose dynamic role lacks /admin/photos access", async () => {
        authMock.mockResolvedValue({ userId: "clerk_user_1" } as never);
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ role: "MEMBER", userRole: { id: "r1", name: "Viewer", allowedPaths: [] } }) as never
        );
        checkAccessMock.mockReturnValue(false);
        await expect(deletePhotos(["p1"])).rejects.toThrow("Unauthorized");
    });

    it("getStorageStats throws when the member row does not exist", async () => {
        authMock.mockResolvedValue({ userId: "ghost" } as never);
        prismaMock.member.findUnique.mockResolvedValue(null as never);
        await expect(getStorageStats()).rejects.toThrow("Unauthorized");
    });
});

describe("getRecentEvents", () => {
    beforeEach(() => {
        authMock.mockResolvedValue({ userId: "clerk_user_1" } as never);
    });

    it("returns events for an ADMIN ordered by startAt desc with photo counts", async () => {
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ role: "ADMIN" }) as never);
        const events = [
            { id: "e1", title: "A", startAt: new Date("2026-07-01"), _count: { photos: 3 } }
        ];
        prismaMock.event.findMany.mockResolvedValue(events as never);

        const res = await getRecentEvents();

        expect(res).toEqual(events);
        expect(prismaMock.event.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: { startAt: "desc" },
                take: 50
            })
        );
    });

    it("allows a MODERATOR via legacy role", async () => {
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ role: "MODERATOR" }) as never);
        prismaMock.event.findMany.mockResolvedValue([] as never);
        await expect(getRecentEvents()).resolves.toEqual([]);
    });

    it("allows a dynamic role that checkAccess approves for /admin/photos", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ role: "MEMBER", userRole: { id: "r1", name: "PhotoAdmin", allowedPaths: ["/admin/photos"] } }) as never
        );
        checkAccessMock.mockReturnValue(true);
        prismaMock.event.findMany.mockResolvedValue([] as never);
        await expect(getRecentEvents()).resolves.toEqual([]);
        expect(checkAccessMock).toHaveBeenCalledWith(
            expect.objectContaining({ name: "PhotoAdmin" }),
            "/admin/photos"
        );
    });
});

describe("getRecentPhotos", () => {
    beforeEach(() => {
        authMock.mockResolvedValue({ userId: "clerk_user_1" } as never);
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ role: "ADMIN" }) as never);
    });

    it("caps at 100 and applies no where filter when no eventId is given", async () => {
        prismaMock.photo.findMany.mockResolvedValue([] as never);
        await getRecentPhotos();
        expect(prismaMock.photo.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: {}, take: 100, orderBy: { createdAt: "desc" } })
        );
    });

    it("filters by eventId and removes the take limit when an eventId is given", async () => {
        prismaMock.photo.findMany.mockResolvedValue([
            { id: "ph1", url: "u", createdAt: new Date(), event: { title: "Trip" } }
        ] as never);
        const res = await getRecentPhotos("evt_9");
        expect(prismaMock.photo.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { eventId: "evt_9" }, take: undefined })
        );
        expect(res).toHaveLength(1);
    });
});

describe("deletePhotos / deletePhoto", () => {
    beforeEach(() => {
        authMock.mockResolvedValue({ userId: "clerk_user_1" } as never);
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ role: "ADMIN" }) as never);
        prismaMock.photo.deleteMany.mockResolvedValue({ count: 0 } as never);
    });

    it("returns success without touching UTApi when no photos match the ids", async () => {
        prismaMock.photo.findMany.mockResolvedValue([] as never);
        const res = await deletePhotos(["nope"]);
        expect(res).toEqual({ success: true });
        expect(utDeleteFiles).not.toHaveBeenCalled();
        expect(prismaMock.photo.deleteMany).not.toHaveBeenCalled();
    });

    it("derives file keys from photo URLs and deletes via UTApi then removes rows", async () => {
        prismaMock.photo.findMany.mockResolvedValue([
            { id: "p1", url: "https://utfs.io/f/abc123", eventId: "e1" },
            { id: "p2", url: "https://utfs.io/f/def456", eventId: "e1" }
        ] as never);

        const res = await deletePhotos(["p1", "p2"]);

        expect(res).toEqual({ success: true });
        expect(utDeleteFiles).toHaveBeenCalledWith(["abc123", "def456"]);
        expect(prismaMock.photo.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["p1", "p2"] } } });
    });

    it("derives the key from a trailing-slash URL and filters out URLs with no usable segment", async () => {
        // The key derivation drops empty segments (filter(Boolean)) before taking the last one.
        // A trailing-slash URL still yields its final non-empty segment ("keyA"), so it is kept.
        // A url that is just "" or "/" has no non-empty segment, so it is filtered out.
        prismaMock.photo.findMany.mockResolvedValue([
            { id: "p1", url: "https://utfs.io/f/keyA/", eventId: "e1" }, // trailing slash -> "keyA"
            { id: "p2", url: "https://utfs.io/f/keyB", eventId: "e1" }, // no trailing slash -> "keyB"
            { id: "p3", url: "", eventId: "e2" }, // genuinely empty -> filtered out
            { id: "p4", url: "/", eventId: "e2" } // only a slash -> filtered out
        ] as never);

        await deletePhotos(["p1", "p2", "p3", "p4"]);

        // Trailing-slash URL now contributes "keyA"; the empty / slash-only URLs are dropped.
        expect(utDeleteFiles).toHaveBeenCalledTimes(1);
        expect(utDeleteFiles).toHaveBeenCalledWith(["keyA", "keyB"]);
    });

    it("propagates the error when UTApi.deleteFiles throws", async () => {
        prismaMock.photo.findMany.mockResolvedValue([
            { id: "p1", url: "https://utfs.io/f/keyA", eventId: "e1" }
        ] as never);
        utDeleteFiles.mockRejectedValue(new Error("UT delete failed"));

        await expect(deletePhotos(["p1"])).rejects.toThrow("UT delete failed");
        expect(prismaMock.photo.deleteMany).not.toHaveBeenCalled();
    });

    it("deletePhoto delegates to deletePhotos with a single id", async () => {
        prismaMock.photo.findMany.mockResolvedValue([
            { id: "solo", url: "https://utfs.io/f/keySolo", eventId: "e1" }
        ] as never);

        const res = await deletePhoto("solo");
        expect(res).toEqual({ success: true });
        expect(prismaMock.photo.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: { in: ["solo"] } } })
        );
        expect(utDeleteFiles).toHaveBeenCalledWith(["keySolo"]);
    });
});

describe("getStorageStats", () => {
    beforeEach(() => {
        authMock.mockResolvedValue({ userId: "clerk_user_1" } as never);
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ role: "ADMIN" }) as never);
    });

    it("returns the UploadThing usage figures for an authorized admin", async () => {
        utGetUsageInfo.mockResolvedValue({
            totalBytes: 100,
            appTotalBytes: 200,
            filesUploaded: 5,
            limitBytes: 1000
        } as never);
        const res = await getStorageStats();
        expect(res).toEqual({ totalBytes: 100, appTotalBytes: 200, filesUploaded: 5, limitBytes: 1000 });
    });

    it("returns null when UTApi.getUsageInfo throws", async () => {
        utGetUsageInfo.mockRejectedValue(new Error("usage error"));
        const res = await getStorageStats();
        expect(res).toBeNull();
    });
});

// =====================================================================================
// reports.ts — getFinancialReport
// =====================================================================================
describe("getFinancialReport", () => {
    const start = new Date("2026-06-01T08:30:00.000Z");
    const end = new Date("2026-06-30T15:00:00.000Z");

    it("queries active members and normalizes the date range to full days", async () => {
        prismaMock.member.findMany.mockResolvedValue([] as never);
        prismaMock.transaction.findMany.mockResolvedValue([] as never);

        const res = await getFinancialReport(start, end);

        expect(res.success).toBe(true);
        expect(prismaMock.member.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { deletedAt: null }, orderBy: { firstName: "asc" } })
        );
        const txArgs = prismaMock.transaction.findMany.mock.calls[0][0] as {
            where: { date: { gte: Date; lte: Date } };
        };
        // Start clamped to 00:00:00.000, end clamped to 23:59:59.999 (local time).
        expect(txArgs.where.date.gte.getHours()).toBe(0);
        expect(txArgs.where.date.gte.getMinutes()).toBe(0);
        expect(txArgs.where.date.lte.getHours()).toBe(23);
        expect(txArgs.where.date.lte.getMilliseconds()).toBe(999);
    });

    it("builds the member column list as 'First Last'", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            { id: "m1", firstName: "Ola", lastName: "Nordmann" },
            { id: "m2", firstName: "Kari", lastName: "Hansen" }
        ] as never);
        prismaMock.transaction.findMany.mockResolvedValue([] as never);

        const res = await getFinancialReport(start, end);
        expect(res.data?.members).toEqual([
            { id: "m1", name: "Ola Nordmann" },
            { id: "m2", name: "Kari Hansen" }
        ]);
    });

    it("groups transactions by description+category and sums totals and per-member amounts", async () => {
        prismaMock.member.findMany.mockResolvedValue([
            { id: "m1", firstName: "Ola", lastName: "Nordmann" }
        ] as never);
        prismaMock.transaction.findMany.mockResolvedValue([
            makeTransaction({
                id: "t1",
                description: "Dugnad",
                category: "OTHER",
                amount: dec(100),
                memberId: "m1",
                date: new Date("2026-06-10T00:00:00.000Z")
            }),
            makeTransaction({
                id: "t2",
                description: "Dugnad",
                category: "OTHER",
                amount: dec(50),
                memberId: "m1",
                date: new Date("2026-06-12T00:00:00.000Z")
            })
        ] as never);

        const res = await getFinancialReport(start, end);
        expect(res.data?.rows).toHaveLength(1);
        const row = res.data!.rows[0];
        expect(row.totalAmount).toBe(150);
        expect(row.memberAmounts).toEqual({ m1: 150 });
        expect(row.type).toBe("INNTEKT");
    });

    it("classifies a negative total as UTGIFT and keeps separate groups for differing categories", async () => {
        prismaMock.member.findMany.mockResolvedValue([] as never);
        prismaMock.transaction.findMany.mockResolvedValue([
            makeTransaction({ id: "t1", description: "Innkjøp", category: "GEAR", amount: dec(-300), memberId: null }),
            makeTransaction({ id: "t2", description: "Innkjøp", category: "FOOD", amount: dec(20), memberId: null })
        ] as never);

        const res = await getFinancialReport(start, end);
        expect(res.data?.rows).toHaveLength(2);
        const gear = res.data!.rows.find((r) => r.category === "GEAR")!;
        expect(gear.type).toBe("UTGIFT");
        expect(gear.totalAmount).toBe(-300);
        // memberId null -> no per-member attribution.
        expect(gear.memberAmounts).toEqual({});
    });

    it("treats a zero amount as INNTEKT (>= 0 boundary)", async () => {
        prismaMock.member.findMany.mockResolvedValue([] as never);
        prismaMock.transaction.findMany.mockResolvedValue([
            makeTransaction({ id: "t1", description: "Justering", category: "OTHER", amount: dec(0), memberId: null })
        ] as never);

        const res = await getFinancialReport(start, end);
        expect(res.data?.rows[0].type).toBe("INNTEKT");
        expect(res.data?.rows[0].totalAmount).toBe(0);
    });

    it("sorts rows by reference date descending", async () => {
        prismaMock.member.findMany.mockResolvedValue([] as never);
        prismaMock.transaction.findMany.mockResolvedValue([
            makeTransaction({ id: "t1", description: "Eldre", category: "OTHER", amount: dec(10), memberId: null, date: new Date("2026-06-01T00:00:00.000Z") }),
            makeTransaction({ id: "t2", description: "Nyere", category: "OTHER", amount: dec(10), memberId: null, date: new Date("2026-06-20T00:00:00.000Z") })
        ] as never);

        const res = await getFinancialReport(start, end);
        expect(res.data?.rows.map((r) => r.description)).toEqual(["Nyere", "Eldre"]);
    });

    it("returns an empty report when there are no transactions", async () => {
        prismaMock.member.findMany.mockResolvedValue([] as never);
        prismaMock.transaction.findMany.mockResolvedValue([] as never);
        const res = await getFinancialReport(start, end);
        expect(res).toEqual({ success: true, data: { members: [], rows: [] } });
    });

    it("returns a Norwegian error message when a query throws", async () => {
        prismaMock.member.findMany.mockRejectedValue(new Error("db down"));
        const res = await getFinancialReport(start, end);
        expect(res).toEqual({ success: false, error: "Kunne ikke generere rapport." });
    });
});

// =====================================================================================
// files.ts — deleteFile, getRecentFiles
// =====================================================================================
describe("deleteFile", () => {
    it("deletes via UTApi and returns success", async () => {
        const res = await deleteFile("file_key_1");
        expect(res).toEqual({ success: true });
        expect(utDeleteFiles).toHaveBeenCalledWith("file_key_1");
    });

    it("returns a failure result when UTApi.deleteFiles throws", async () => {
        utDeleteFiles.mockRejectedValue(new Error("boom"));
        const res = await deleteFile("file_key_2");
        expect(res).toEqual({ success: false, error: "Failed to delete file" });
    });
});

describe("getRecentFiles", () => {
    beforeEach(() => {
        authMock.mockResolvedValue({ userId: "clerk_user_1" } as never);
    });

    it("returns an empty array when unauthenticated", async () => {
        authMock.mockResolvedValue({ userId: null } as never);
        const res = await getRecentFiles();
        expect(res).toEqual([]);
        expect(prismaMock.postAttachment.findMany).not.toHaveBeenCalled();
    });

    it("returns recent attachments ordered by createdAt desc with the default limit of 5", async () => {
        const files = [{ id: "a1", createdAt: new Date(), post: { id: "po1", title: "Post" } }];
        prismaMock.postAttachment.findMany.mockResolvedValue(files as never);

        const res = await getRecentFiles();
        expect(res).toEqual(files);
        expect(prismaMock.postAttachment.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 5, orderBy: { createdAt: "desc" } })
        );
    });

    it("honors a custom limit", async () => {
        prismaMock.postAttachment.findMany.mockResolvedValue([] as never);
        await getRecentFiles(10);
        expect(prismaMock.postAttachment.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 10 })
        );
    });

    it("returns an empty array when the query throws", async () => {
        prismaMock.postAttachment.findMany.mockRejectedValue(new Error("db error"));
        const res = await getRecentFiles();
        expect(res).toEqual([]);
    });
});
