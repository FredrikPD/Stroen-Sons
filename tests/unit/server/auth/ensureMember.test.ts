import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "../../../helpers/prisma";
import { makeMember, makeClerkUser } from "../../../helpers/fixtures";
import { authMock, currentUserMock } from "../../../helpers/auth";

// `@/server/auth/ensureMember` is globally mocked in tests/setup.ts. Pull in the REAL
// implementation so we can exercise its branching against the (mocked) Prisma client
// and the (mocked) Clerk primitives.
const { ensureMember } = await vi.importActual<typeof import("@/server/auth/ensureMember")>(
    "@/server/auth/ensureMember"
);

const FIXED_NOW = new Date("2026-06-15T12:00:00.000Z");

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("ensureMember", () => {
    describe("authentication guards", () => {
        it("throws Unauthorized when there is no Clerk userId", async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            authMock.mockResolvedValue({ userId: null } as any);
            await expect(ensureMember()).rejects.toThrow("Unauthorized");
            expect(prismaMock.member.findUnique).not.toHaveBeenCalled();
        });

        it("throws Unauthorized when currentUser() returns null", async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            authMock.mockResolvedValue({ userId: "clerk_user_1" } as any);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            currentUserMock.mockResolvedValue(null as any);
            await expect(ensureMember()).rejects.toThrow("Unauthorized");
            expect(prismaMock.member.findUnique).not.toHaveBeenCalled();
        });

        it("throws Missing email when the user has no email address", async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            authMock.mockResolvedValue({ userId: "clerk_user_1" } as any);
            currentUserMock.mockResolvedValue(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                makeClerkUser({ emailAddresses: [] }) as any
            );
            await expect(ensureMember()).rejects.toThrow("Missing email");
        });

        it("throws Missing email when emailAddress is empty/undefined", async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            authMock.mockResolvedValue({ userId: "clerk_user_1" } as any);
            currentUserMock.mockResolvedValue(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                makeClerkUser({ emailAddresses: [{ emailAddress: undefined }] }) as any
            );
            await expect(ensureMember()).rejects.toThrow("Missing email");
        });
    });

    describe("find by Clerk id", () => {
        beforeEach(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            authMock.mockResolvedValue({ userId: "clerk_abc" } as any);
        });

        it("looks up the member by clerkId, lower-casing the email", async () => {
            currentUserMock.mockResolvedValue(
                makeClerkUser({
                    emailAddresses: [{ emailAddress: "MixedCase@Example.COM" }],
                    imageUrl: "https://img/a.png"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }) as any
            );
            // Recently active + matching avatar -> returns existing without an update.
            const member = makeMember({
                id: "m1",
                avatarUrl: "https://img/a.png",
                lastActiveAt: new Date(FIXED_NOW.getTime() - 60 * 1000) // 1 min ago
            });
            prismaMock.member.findUnique.mockResolvedValue(member as never);

            const result = await ensureMember();

            expect(prismaMock.member.findUnique).toHaveBeenCalledWith({
                where: { clerkId: "clerk_abc" },
                include: { userRole: true }
            });
            expect(result).toBe(member);
            expect(prismaMock.member.update).not.toHaveBeenCalled();
        });

        it("rejects a soft-deleted account found by clerkId", async () => {
            currentUserMock.mockResolvedValue(makeClerkUser() as never);
            prismaMock.member.findUnique.mockResolvedValue(
                makeMember({ id: "m_deleted", deletedAt: new Date("2026-01-01") }) as never
            );
            await expect(ensureMember()).rejects.toThrow("Account has been deleted");
            expect(prismaMock.member.update).not.toHaveBeenCalled();
        });
    });

    describe("lastActive / avatar sync on an existing member", () => {
        beforeEach(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            authMock.mockResolvedValue({ userId: "clerk_abc" } as any);
        });

        it("updates lastActiveAt when the member was last active over 15 minutes ago", async () => {
            currentUserMock.mockResolvedValue(
                makeClerkUser({ imageUrl: "https://img/same.png" }) as never
            );
            const stale = makeMember({
                id: "m_stale",
                avatarUrl: "https://img/same.png",
                lastActiveAt: new Date(FIXED_NOW.getTime() - 20 * 60 * 1000) // 20 min ago
            });
            prismaMock.member.findUnique.mockResolvedValue(stale as never);
            const updated = makeMember({ id: "m_stale", lastActiveAt: FIXED_NOW });
            prismaMock.member.update.mockResolvedValue(updated as never);

            const result = await ensureMember();

            expect(prismaMock.member.update).toHaveBeenCalledWith({
                where: { id: "m_stale" },
                data: { avatarUrl: "https://img/same.png", lastActiveAt: FIXED_NOW },
                include: { userRole: true }
            });
            expect(result).toBe(updated);
        });

        it("updates lastActiveAt when the member has never been active (null lastActiveAt)", async () => {
            currentUserMock.mockResolvedValue(
                makeClerkUser({ imageUrl: null }) as never
            );
            const neverActive = makeMember({
                id: "m_new_active",
                avatarUrl: null,
                lastActiveAt: null
            });
            prismaMock.member.findUnique.mockResolvedValue(neverActive as never);
            prismaMock.member.update.mockResolvedValue(neverActive as never);

            await ensureMember();

            expect(prismaMock.member.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: "m_new_active" },
                    data: { avatarUrl: null, lastActiveAt: FIXED_NOW }
                })
            );
        });

        it("syncs the avatar when the Clerk image differs, even if recently active", async () => {
            currentUserMock.mockResolvedValue(
                makeClerkUser({ imageUrl: "https://img/new.png" }) as never
            );
            const recent = makeMember({
                id: "m_avatar",
                avatarUrl: "https://img/old.png",
                lastActiveAt: new Date(FIXED_NOW.getTime() - 60 * 1000) // recent
            });
            prismaMock.member.findUnique.mockResolvedValue(recent as never);
            prismaMock.member.update.mockResolvedValue(recent as never);

            await ensureMember();

            expect(prismaMock.member.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { avatarUrl: "https://img/new.png", lastActiveAt: FIXED_NOW }
                })
            );
        });

        it("does NOT update when recently active and avatar already matches", async () => {
            currentUserMock.mockResolvedValue(
                makeClerkUser({ imageUrl: "https://img/same.png" }) as never
            );
            const fresh = makeMember({
                avatarUrl: "https://img/same.png",
                lastActiveAt: new Date(FIXED_NOW.getTime() - 5 * 60 * 1000) // 5 min ago
            });
            prismaMock.member.findUnique.mockResolvedValue(fresh as never);

            const result = await ensureMember();

            expect(prismaMock.member.update).not.toHaveBeenCalled();
            expect(result).toBe(fresh);
        });

        it("normalises a missing Clerk imageUrl to null when syncing the avatar", async () => {
            currentUserMock.mockResolvedValue(
                makeClerkUser({ imageUrl: undefined }) as never
            );
            const recent = makeMember({
                avatarUrl: "https://img/old.png",
                lastActiveAt: new Date(FIXED_NOW.getTime() - 60 * 1000)
            });
            prismaMock.member.findUnique.mockResolvedValue(recent as never);
            prismaMock.member.update.mockResolvedValue(recent as never);

            await ensureMember();

            expect(prismaMock.member.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { avatarUrl: null, lastActiveAt: FIXED_NOW } })
            );
        });
    });

    describe("lazy-link by email (invited users)", () => {
        beforeEach(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            authMock.mockResolvedValue({ userId: "clerk_link" } as any);
            currentUserMock.mockResolvedValue(
                makeClerkUser({
                    firstName: "Clerk",
                    lastName: "Name",
                    imageUrl: "https://img/clerk.png",
                    emailAddresses: [{ emailAddress: "invited@example.com" }]
                }) as never
            );
            // Not found by clerkId -> falls through to find-by-email.
            prismaMock.member.findUnique.mockResolvedValueOnce(null as never);
        });

        it("links the Clerk id and activates an existing member found by email", async () => {
            const invited = makeMember({
                id: "m_invited",
                clerkId: "placeholder",
                status: "INVITED",
                firstName: "Existing",
                lastName: "Person",
                email: "invited@example.com"
            });
            prismaMock.member.findUnique.mockResolvedValueOnce(invited as never);
            prismaMock.member.update.mockResolvedValue(
                makeMember({ id: "m_invited", clerkId: "clerk_link", status: "ACTIVE" }) as never
            );

            await ensureMember();

            // Second findUnique is the find-by-email lookup (lowercased).
            expect(prismaMock.member.findUnique).toHaveBeenNthCalledWith(2, {
                where: { email: "invited@example.com" },
                include: { userRole: true }
            });
            expect(prismaMock.member.update).toHaveBeenCalledWith({
                where: { id: "m_invited" },
                data: {
                    clerkId: "clerk_link",
                    status: "ACTIVE",
                    // DB names are authoritative when present.
                    firstName: "Existing",
                    lastName: "Person",
                    avatarUrl: "https://img/clerk.png"
                },
                include: { userRole: true }
            });
        });

        it("falls back to Clerk names when the existing record's names are empty", async () => {
            const invited = makeMember({
                id: "m_empty_names",
                status: "INVITED",
                firstName: "",
                lastName: "",
                email: "invited@example.com"
            });
            prismaMock.member.findUnique.mockResolvedValueOnce(invited as never);
            prismaMock.member.update.mockResolvedValue(invited as never);

            await ensureMember();

            expect(prismaMock.member.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({ firstName: "Clerk", lastName: "Name" })
                })
            );
        });

        it("rejects a soft-deleted account found by email", async () => {
            const deleted = makeMember({
                id: "m_email_deleted",
                email: "invited@example.com",
                deletedAt: new Date("2026-01-01")
            });
            prismaMock.member.findUnique.mockResolvedValueOnce(deleted as never);
            await expect(ensureMember()).rejects.toThrow("Account has been deleted");
            expect(prismaMock.member.update).not.toHaveBeenCalled();
        });
    });

    describe("create a brand-new member (self sign-up)", () => {
        it("creates an ACTIVE member when no record exists by clerkId or email", async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            authMock.mockResolvedValue({ userId: "clerk_fresh" } as any);
            currentUserMock.mockResolvedValue(
                makeClerkUser({
                    firstName: "Brand",
                    lastName: "New",
                    imageUrl: "https://img/fresh.png",
                    emailAddresses: [{ emailAddress: "Fresh@Example.com" }]
                }) as never
            );
            // Neither lookup finds anything.
            prismaMock.member.findUnique
                .mockResolvedValueOnce(null as never)
                .mockResolvedValueOnce(null as never);
            const created = makeMember({ id: "m_created", status: "ACTIVE" });
            prismaMock.member.create.mockResolvedValue(created as never);

            const result = await ensureMember();

            expect(prismaMock.member.create).toHaveBeenCalledWith({
                data: {
                    clerkId: "clerk_fresh",
                    email: "fresh@example.com",
                    firstName: "Brand",
                    lastName: "New",
                    avatarUrl: "https://img/fresh.png",
                    status: "ACTIVE"
                },
                include: { userRole: true }
            });
            expect(result).toBe(created);
        });

        it("creates a member with a null avatar when Clerk has no imageUrl", async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            authMock.mockResolvedValue({ userId: "clerk_fresh2" } as any);
            currentUserMock.mockResolvedValue(
                makeClerkUser({ imageUrl: null, emailAddresses: [{ emailAddress: "n@e.com" }] }) as never
            );
            prismaMock.member.findUnique
                .mockResolvedValueOnce(null as never)
                .mockResolvedValueOnce(null as never);
            prismaMock.member.create.mockResolvedValue(makeMember() as never);

            await ensureMember();

            expect(prismaMock.member.create).toHaveBeenCalledWith(
                expect.objectContaining({ data: expect.objectContaining({ avatarUrl: null }) })
            );
        });
    });
});
