import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { makeMember, makeUserRole, dec } from "../../helpers/fixtures";
import { authMock } from "../../helpers/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ensureRoleMock } from "../../helpers/auth";

import { getProfile, updateProfile, updatePassword } from "@/server/actions/account";
import { getMembers } from "@/server/actions/members";
import {
    getSystemSetting,
    updateSystemSetting,
    getPhotoSettings
} from "@/server/actions/settings";

const clerkClientMock = vi.mocked(clerkClient);
const revalidatePathMock = vi.mocked(revalidatePath);

/**
 * account.ts calls `clerkClient()` and then `client.users.updateUser(...)`.
 * The global clerkClient mock does NOT expose `updateUser`, so install a per-test
 * client that does. Returns the `updateUser` spy for assertions.
 */
function installClerkClient(overrides: Record<string, unknown> = {}) {
    const updateUser = vi.fn(async () => ({ id: "clerk_user_1" }));
    const client = { users: { updateUser, ...overrides } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clerkClientMock.mockResolvedValue(client as any);
    return { updateUser, client };
}

/** Make `auth()` resolve to a signed-in user (or null when `userId` is null). */
function setAuthUser(userId: string | null = "clerk_user_1") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authMock.mockResolvedValue({ userId } as any);
}

beforeEach(() => {
    // Default to an authenticated clerk user for every test.
    setAuthUser("clerk_user_1");
    installClerkClient();
});

// ---------------------------------------------------------------------------
// account.ts — getProfile
// ---------------------------------------------------------------------------

describe("account.getProfile", () => {
    it("returns the member with balance coerced to a number", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({
                id: "m1",
                clerkId: "clerk_user_1",
                balance: dec(1234.5),
                _count: { eventsAttending: 2, posts: 3 }
            }) as never
        );

        const res = await getProfile();

        expect(res.success).toBe(true);
        expect(res.data?.balance).toBe(1234.5);
        expect(typeof res.data?.balance).toBe("number");
        expect(prismaMock.member.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { clerkId: "clerk_user_1" } })
        );
    });

    it("rejects an unauthenticated caller", async () => {
        setAuthUser(null);
        const res = await getProfile();
        expect(res).toEqual({ success: false, error: "Ikke autentisert" });
        expect(prismaMock.member.findUnique).not.toHaveBeenCalled();
    });

    it("returns an error when no member matches the clerk id", async () => {
        prismaMock.member.findUnique.mockResolvedValue(null as never);
        const res = await getProfile();
        expect(res).toEqual({ success: false, error: "Fant ikke medlem" });
    });

    it("returns a friendly error when the database query throws (non-transient)", async () => {
        prismaMock.member.findUnique.mockRejectedValue(new Error("Unique constraint failed"));
        const res = await getProfile();
        expect(res).toEqual({ success: false, error: "Kunne ikke hente profil" });
    });
});

// ---------------------------------------------------------------------------
// account.ts — updateProfile
// ---------------------------------------------------------------------------

describe("account.updateProfile", () => {
    const validInput = {
        firstName: "Ola",
        lastName: "Nordmann",
        email: "ola@example.com",
        phoneNumber: "12345678",
        address: "Storgata 1",
        zipCode: "0001",
        city: "Oslo"
    };

    it("updates Clerk name and the DB member, then revalidates", async () => {
        const { updateUser } = installClerkClient();
        prismaMock.member.update.mockResolvedValue(makeMember() as never);

        const res = await updateProfile(validInput);

        expect(res).toEqual({ success: true });
        expect(updateUser).toHaveBeenCalledWith(
            "clerk_user_1",
            expect.objectContaining({ firstName: "Ola", lastName: "Nordmann" })
        );
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { clerkId: "clerk_user_1" },
                data: expect.objectContaining({
                    firstName: "Ola",
                    lastName: "Nordmann",
                    email: "ola@example.com",
                    phoneNumber: "12345678",
                    address: "Storgata 1",
                    zipCode: "0001",
                    city: "Oslo"
                })
            })
        );
        expect(revalidatePathMock).toHaveBeenCalledWith("/account");
    });

    it("rejects an unauthenticated caller before touching Clerk or the DB", async () => {
        setAuthUser(null);
        const { updateUser } = installClerkClient();
        const res = await updateProfile(validInput);
        expect(res).toEqual({ success: false, error: "Ikke autentisert" });
        expect(updateUser).not.toHaveBeenCalled();
        expect(prismaMock.member.update).not.toHaveBeenCalled();
    });

    it("returns a friendly error when the Clerk update throws", async () => {
        installClerkClient({
            updateUser: vi.fn(async () => {
                throw new Error("clerk down");
            })
        });
        const res = await updateProfile(validInput);
        expect(res).toEqual({ success: false, error: "Kunne ikke oppdatere profil" });
        expect(prismaMock.member.update).not.toHaveBeenCalled();
    });

    it("returns a friendly error when the DB update throws (non-transient)", async () => {
        installClerkClient();
        prismaMock.member.update.mockRejectedValue(new Error("Unique constraint failed"));
        const res = await updateProfile(validInput);
        expect(res).toEqual({ success: false, error: "Kunne ikke oppdatere profil" });
        expect(revalidatePathMock).not.toHaveBeenCalledWith("/account");
    });
});

// ---------------------------------------------------------------------------
// account.ts — updatePassword
// ---------------------------------------------------------------------------

describe("account.updatePassword", () => {
    it("updates the Clerk password for the authenticated user", async () => {
        const { updateUser } = installClerkClient();
        const res = await updatePassword("Sup3rStr0ngPass!");
        expect(res).toEqual({ success: true });
        expect(updateUser).toHaveBeenCalledWith("clerk_user_1", { password: "Sup3rStr0ngPass!" });
    });

    it("rejects an unauthenticated caller", async () => {
        setAuthUser(null);
        const { updateUser } = installClerkClient();
        const res = await updatePassword("anything");
        expect(res).toEqual({ success: false, error: "Ikke autentisert" });
        expect(updateUser).not.toHaveBeenCalled();
    });

    it("returns a friendly error when Clerk rejects the password (e.g. too weak)", async () => {
        installClerkClient({
            updateUser: vi.fn(async () => {
                throw new Error("password too weak");
            })
        });
        const res = await updatePassword("123");
        expect(res).toEqual({
            success: false,
            error: "Kunne ikke oppdatere passord. Pass på at det er sterkt nok."
        });
    });
});

// ---------------------------------------------------------------------------
// members.ts — getMembers
// ---------------------------------------------------------------------------

describe("members.getMembers", () => {
    it("returns only active members, ordered by first then last name", async () => {
        const list = [
            makeMember({ id: "a", firstName: "Anna" }),
            makeMember({ id: "b", firstName: "Bjørn" })
        ];
        prismaMock.member.findMany.mockResolvedValue(list as never);

        const res = await getMembers();

        expect(res.success).toBe(true);
        expect(res.data).toHaveLength(2);
        // Applies the active-member (soft-delete) filter.
        expect(prismaMock.member.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ deletedAt: null }),
                orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
            })
        );
    });

    it("returns an empty array when there are no members", async () => {
        prismaMock.member.findMany.mockResolvedValue([] as never);
        const res = await getMembers();
        expect(res).toEqual({ success: true, data: [] });
    });

    it("returns a friendly error when the query throws", async () => {
        prismaMock.member.findMany.mockRejectedValue(new Error("db down"));
        const res = await getMembers();
        expect(res).toEqual({ success: false, error: "Kunne ikke hente medlemmer." });
    });
});

// ---------------------------------------------------------------------------
// settings.ts — getSystemSetting
// ---------------------------------------------------------------------------

describe("settings.getSystemSetting", () => {
    it("returns the stored value when the setting exists", async () => {
        prismaMock.systemSetting.findUnique.mockResolvedValue({
            key: "PHOTO_MAX_SIZE_MB",
            value: "16"
        } as never);
        const res = await getSystemSetting("PHOTO_MAX_SIZE_MB");
        expect(res).toBe("16");
        expect(prismaMock.systemSetting.findUnique).toHaveBeenCalledWith({
            where: { key: "PHOTO_MAX_SIZE_MB" }
        });
    });

    it("returns null when the setting is missing", async () => {
        prismaMock.systemSetting.findUnique.mockResolvedValue(null as never);
        const res = await getSystemSetting("NOPE");
        expect(res).toBeNull();
    });

    it("returns null when the stored value is an empty string", async () => {
        prismaMock.systemSetting.findUnique.mockResolvedValue({
            key: "EMPTY",
            value: ""
        } as never);
        const res = await getSystemSetting("EMPTY");
        expect(res).toBeNull();
    });

    it("returns null when the query throws", async () => {
        prismaMock.systemSetting.findUnique.mockRejectedValue(new Error("boom"));
        const res = await getSystemSetting("X");
        expect(res).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// settings.ts — updateSystemSetting
// ---------------------------------------------------------------------------

describe("settings.updateSystemSetting", () => {
    it("upserts the setting and revalidates the affected pages for an admin", async () => {
        ensureRoleMock.mockResolvedValue(makeMember({ role: "ADMIN" }) as never);
        prismaMock.systemSetting.upsert.mockResolvedValue({
            key: "PHOTO_MAX_FILES",
            value: "100"
        } as never);

        const res = await updateSystemSetting("PHOTO_MAX_FILES", "100");

        expect(res).toEqual({ success: true });
        expect(prismaMock.systemSetting.upsert).toHaveBeenCalledWith({
            where: { key: "PHOTO_MAX_FILES" },
            update: { value: "100" },
            create: { key: "PHOTO_MAX_FILES", value: "100" }
        });
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/system");
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/photos");
    });

    it("rejects a caller without the ADMIN role and does not write", async () => {
        ensureRoleMock.mockRejectedValue(new Error("Unauthorized"));
        const res = await updateSystemSetting("PHOTO_MAX_FILES", "100");
        expect(res).toEqual({ success: false, error: "Kunne ikke oppdatere innstilling" });
        expect(prismaMock.systemSetting.upsert).not.toHaveBeenCalled();
        expect(revalidatePathMock).not.toHaveBeenCalledWith("/admin/system");
    });

    it("returns a friendly error when the upsert throws", async () => {
        ensureRoleMock.mockResolvedValue(makeMember({ role: "ADMIN" }) as never);
        prismaMock.systemSetting.upsert.mockRejectedValue(new Error("db down"));
        const res = await updateSystemSetting("K", "V");
        expect(res).toEqual({ success: false, error: "Kunne ikke oppdatere innstilling" });
    });
});

// ---------------------------------------------------------------------------
// settings.ts — getPhotoSettings
// ---------------------------------------------------------------------------

describe("settings.getPhotoSettings", () => {
    it("parses stored numeric settings", async () => {
        prismaMock.systemSetting.findUnique.mockImplementation((async (args: { where: { key: string } }) => {
            const map: Record<string, string> = {
                PHOTO_MAX_SIZE_MB: "16",
                PHOTO_MAX_FILES: "100"
            };
            const value = map[args.where.key];
            return value ? { key: args.where.key, value } : null;
        }) as never);

        const res = await getPhotoSettings();
        expect(res).toEqual({ maxSizeMB: 16, maxFiles: 100 });
    });

    it("falls back to defaults when settings are absent", async () => {
        prismaMock.systemSetting.findUnique.mockResolvedValue(null as never);
        const res = await getPhotoSettings();
        expect(res).toEqual({ maxSizeMB: 8, maxFiles: 50 });
    });

    it("falls back to defaults when getSystemSetting swallows a DB error (returns null)", async () => {
        // getSystemSetting catches its own error and returns null, so getPhotoSettings
        // sees null for both keys and uses the defaults.
        prismaMock.systemSetting.findUnique.mockRejectedValue(new Error("boom"));
        const res = await getPhotoSettings();
        expect(res).toEqual({ maxSizeMB: 8, maxFiles: 50 });
    });

    it("parses a stored size while defaulting the missing file count", async () => {
        prismaMock.systemSetting.findUnique.mockImplementation((async (args: { where: { key: string } }) => {
            if (args.where.key === "PHOTO_MAX_SIZE_MB") {
                return { key: args.where.key, value: "32" };
            }
            return null;
        }) as never);

        const res = await getPhotoSettings();
        expect(res).toEqual({ maxSizeMB: 32, maxFiles: 50 });
    });
});
