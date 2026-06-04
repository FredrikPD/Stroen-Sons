import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { makeMember, makeUserRole, makeMembershipType } from "../../helpers/fixtures";
import { loginAsAdmin, loginAsMember, logout, ensureRoleMock } from "../../helpers/auth";
import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";

import {
    getMembers,
    getAvailableRoles,
    updateMemberRole,
    updateMemberType
} from "@/server/actions/admin-roles";
import {
    getRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    assignRole
} from "@/server/actions/roles";
import {
    getMembershipTypes,
    createMembershipType,
    updateMembershipType,
    deleteMembershipType,
    seedDefaultTypes
} from "@/server/actions/membership-types";

const revalidatePathMock = vi.mocked(revalidatePath);

// Make ensureRole behave like the real guard: it rejects when the (default) admin login
// is overridden with a non-admin / unauthenticated session. The auth helpers already
// resolve ensureRole to the logged-in member, but ensureRole in production THROWS for
// callers lacking the required role. Re-create that throwing behavior here so guard
// tests exercise the catch branch in each action.
function denyRole() {
    ensureRoleMock.mockRejectedValue(new Error("Forbidden"));
}

beforeEach(() => {
    // Default: authenticated admin (set by global beforeEach via resetAuthMocks).
    loginAsAdmin();
});

// ---------------------------------------------------------------------------
// admin-roles.ts
// ---------------------------------------------------------------------------

describe("admin-roles.getMembers", () => {
    it("returns active members ordered by first name", async () => {
        const members = [
            { id: "m1", firstName: "Alice", lastName: "A", role: "MEMBER" },
            { id: "m2", firstName: "Bob", lastName: "B", role: "ADMIN" }
        ];
        prismaMock.member.findMany.mockResolvedValue(members as never);

        const res = await getMembers();

        expect(res.success).toBe(true);
        expect(res.data).toEqual(members);
        expect(prismaMock.member.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ deletedAt: null }),
                orderBy: { firstName: "asc" }
            })
        );
    });

    it("returns an error when the query fails", async () => {
        prismaMock.member.findMany.mockRejectedValue(new Error("db down"));
        const res = await getMembers();
        expect(res).toEqual({ success: false, error: "Failed to fetch members" });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await getMembers();
        expect(res.success).toBe(false);
        expect(prismaMock.member.findMany).not.toHaveBeenCalled();
    });
});

describe("admin-roles.getAvailableRoles", () => {
    it("returns roles ordered by name", async () => {
        const roles = [{ id: "r1", name: "Admin" }, { id: "r2", name: "Editor" }];
        prismaMock.userRole.findMany.mockResolvedValue(roles as never);

        const res = await getAvailableRoles();

        expect(res.success).toBe(true);
        expect(res.data).toEqual(roles);
        expect(prismaMock.userRole.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: { name: "asc" } })
        );
    });

    it("returns a Norwegian error when the query fails", async () => {
        prismaMock.userRole.findMany.mockRejectedValue(new Error("boom"));
        const res = await getAvailableRoles();
        expect(res).toEqual({ success: false, error: "Kunne ikke hente roller" });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await getAvailableRoles();
        expect(res.success).toBe(false);
    });
});

describe("admin-roles.updateMemberRole", () => {
    beforeEach(() => {
        prismaMock.member.update.mockResolvedValue({ clerkId: "clerk_x" } as never);
    });

    it("rejects an empty role id without touching the database", async () => {
        const res = await updateMemberRole("m1", "");
        expect(res).toEqual({ success: false, error: "Ugyldig rolle" });
        expect(prismaMock.userRole.findUnique).not.toHaveBeenCalled();
        expect(prismaMock.member.update).not.toHaveBeenCalled();
    });

    it("returns not-found when the role does not exist", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(null as never);
        const res = await updateMemberRole("m1", "missing");
        expect(res).toEqual({ success: false, error: "Rolle ikke funnet" });
        expect(prismaMock.member.update).not.toHaveBeenCalled();
    });

    it("maps an 'Admin' role name to the legacy ADMIN enum and syncs Clerk", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(
            makeUserRole({ id: "role_admin", name: "Admin" }) as never
        );

        const res = await updateMemberRole("m1", "role_admin");

        expect(res).toEqual({ success: true });
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "m1" },
                data: { role: "ADMIN", userRoleId: "role_admin" }
            })
        );
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users");
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users/roles");
    });

    it("maps a 'Moderator' role name (case-insensitive) to MODERATOR", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(
            makeUserRole({ id: "role_mod", name: "  moderator " }) as never
        );

        await updateMemberRole("m1", "role_mod");

        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { role: "MODERATOR", userRoleId: "role_mod" } })
        );
    });

    it("maps any other role name to the MEMBER enum", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(
            makeUserRole({ id: "role_ed", name: "Editor" }) as never
        );

        await updateMemberRole("m1", "role_ed");

        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { role: "MEMBER", userRoleId: "role_ed" } })
        );
    });

    it("surfaces a warning when Clerk metadata sync fails (but DB write succeeded)", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(
            makeUserRole({ id: "role_ed", name: "Editor" }) as never
        );
        // Make clerkClient().users.updateUserMetadata throw so syncClerkRoleMetadata
        // returns { success:false, skipped:false, error }.
        vi.mocked(clerkClient).mockResolvedValueOnce({
            users: { updateUserMetadata: vi.fn(async () => { throw new Error("clerk down"); }) }
        } as never);

        const res = await updateMemberRole("m1", "role_ed");

        expect(res.success).toBe(true);
        expect((res as { warning?: string }).warning).toBeTruthy();
    });

    it("does not surface a warning when the member has no clerkId (sync skipped)", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(
            makeUserRole({ id: "role_ed", name: "Editor" }) as never
        );
        prismaMock.member.update.mockResolvedValue({ clerkId: null } as never);

        const res = await updateMemberRole("m1", "role_ed");

        expect(res).toEqual({ success: true });
    });

    it("returns an error when the member update throws", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ name: "Editor" }) as never);
        prismaMock.member.update.mockRejectedValue(new Error("no such member"));
        const res = await updateMemberRole("ghost", "role_ed");
        expect(res).toEqual({ success: false, error: "Kunne ikke oppdatere rolle" });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await updateMemberRole("m1", "role_ed");
        expect(res).toEqual({ success: false, error: "Kunne ikke oppdatere rolle" });
        expect(prismaMock.userRole.findUnique).not.toHaveBeenCalled();
    });
});

describe("admin-roles.updateMemberType", () => {
    it("rejects an unknown membership type", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValue(null as never);
        const res = await updateMemberType("m1", "GHOST");
        expect(res).toEqual({ success: false, error: "Ugyldig medlemstype" });
        expect(prismaMock.member.update).not.toHaveBeenCalled();
    });

    it("updates the member's membershipType string and revalidates", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValue({ name: "HONORARY" } as never);
        prismaMock.member.update.mockResolvedValue(makeMember() as never);

        const res = await updateMemberType("m1", "HONORARY");

        expect(res).toEqual({ success: true });
        expect(prismaMock.member.update).toHaveBeenCalledWith({
            where: { id: "m1" },
            data: { membershipType: "HONORARY" }
        });
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users");
    });

    it("returns an error when the update throws", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValue({ name: "STANDARD" } as never);
        prismaMock.member.update.mockRejectedValue(new Error("boom"));
        const res = await updateMemberType("m1", "STANDARD");
        expect(res).toEqual({ success: false, error: "Kunne ikke oppdatere medlemstype" });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await updateMemberType("m1", "STANDARD");
        expect(res.success).toBe(false);
        expect(prismaMock.membershipType.findUnique).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// roles.ts
// ---------------------------------------------------------------------------

describe("roles.getRoles", () => {
    it("returns roles with member counts ordered by name", async () => {
        const roles = [makeUserRole({ name: "Admin", _count: { members: 2 } })];
        prismaMock.userRole.findMany.mockResolvedValue(roles as never);

        const res = await getRoles();

        expect(res.success).toBe(true);
        expect((res as { roles: unknown }).roles).toEqual(roles);
        expect(prismaMock.userRole.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                orderBy: { name: "asc" },
                include: { _count: { select: { members: true } } }
            })
        );
    });

    it("returns an error when the query fails", async () => {
        prismaMock.userRole.findMany.mockRejectedValue(new Error("boom"));
        const res = await getRoles();
        expect(res).toEqual({ success: false, error: "Kunne ikke hente roller." });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await getRoles();
        expect(res.success).toBe(false);
    });
});

describe("roles.getRole", () => {
    it("returns the role when found", async () => {
        const role = makeUserRole({ id: "r1", name: "Editor", allowedPaths: ["/a"] });
        prismaMock.userRole.findUnique.mockResolvedValue(role as never);

        const res = await getRole("r1");

        expect(res.success).toBe(true);
        expect((res as { role: unknown }).role).toEqual(role);
        expect(prismaMock.userRole.findUnique).toHaveBeenCalledWith({ where: { id: "r1" } });
    });

    it("returns not-found when the role is missing", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(null as never);
        const res = await getRole("missing");
        expect(res).toEqual({ success: false, error: "Rolle ikke funnet." });
    });

    it("returns a fetch error when the query throws", async () => {
        prismaMock.userRole.findUnique.mockRejectedValue(new Error("boom"));
        const res = await getRole("r1");
        expect(res).toEqual({ success: false, error: "Kunne ikke hente rolle." });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await getRole("r1");
        expect(res.success).toBe(false);
    });
});

describe("roles.createRole", () => {
    it("creates a role with allowedPaths array and revalidates", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(null as never);
        const created = makeUserRole({ id: "r_new", name: "Editor", allowedPaths: ["/admin", "/x"] });
        prismaMock.userRole.create.mockResolvedValue(created as never);

        const res = await createRole({ name: "Editor", description: "desc", allowedPaths: ["/admin", "/x"] });

        expect(res.success).toBe(true);
        expect((res as { role: unknown }).role).toEqual(created);
        expect(prismaMock.userRole.create).toHaveBeenCalledWith({
            data: { name: "Editor", description: "desc", allowedPaths: ["/admin", "/x"] }
        });
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/system/user-roles");
    });

    it("accepts an empty allowedPaths array", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(null as never);
        prismaMock.userRole.create.mockResolvedValue(makeUserRole() as never);

        const res = await createRole({ name: "Empty", allowedPaths: [] });

        expect(res.success).toBe(true);
        expect(prismaMock.userRole.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ allowedPaths: [] }) })
        );
    });

    it("rejects a duplicate role name without creating", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ name: "Editor" }) as never);

        const res = await createRole({ name: "Editor", allowedPaths: [] });

        expect(res).toEqual({ success: false, error: "En rolle med dette navnet finnes allerede." });
        expect(prismaMock.userRole.create).not.toHaveBeenCalled();
    });

    it("returns an error when create throws", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(null as never);
        prismaMock.userRole.create.mockRejectedValue(new Error("boom"));
        const res = await createRole({ name: "Editor", allowedPaths: [] });
        expect(res).toEqual({ success: false, error: "Kunne ikke opprette rolle." });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await createRole({ name: "Editor", allowedPaths: [] });
        expect(res.success).toBe(false);
        expect(prismaMock.userRole.create).not.toHaveBeenCalled();
    });
});

describe("roles.updateRole", () => {
    it("returns not-found when the role does not exist", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(null as never);
        const res = await updateRole("missing", { name: "X", allowedPaths: [] });
        expect(res).toEqual({ success: false, error: "Rolle ikke funnet." });
        expect(prismaMock.userRole.update).not.toHaveBeenCalled();
    });

    it("updates name, description and allowedPaths and revalidates", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ id: "r1" }) as never);
        prismaMock.userRole.update.mockResolvedValue(makeUserRole({ id: "r1" }) as never);

        const res = await updateRole("r1", { name: "New", description: "d", allowedPaths: ["/p"] });

        expect(res.success).toBe(true);
        expect(prismaMock.userRole.update).toHaveBeenCalledWith({
            where: { id: "r1" },
            data: { name: "New", description: "d", allowedPaths: ["/p"] }
        });
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/system/user-roles");
    });

    it("allows modifying a system role (no isSystem protection on update)", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(
            makeUserRole({ id: "r_sys", isSystem: true }) as never
        );
        prismaMock.userRole.update.mockResolvedValue(makeUserRole({ id: "r_sys" }) as never);

        const res = await updateRole("r_sys", { name: "Admin2", allowedPaths: ["/all"] });

        expect(res.success).toBe(true);
        expect(prismaMock.userRole.update).toHaveBeenCalled();
    });

    it("returns an error when update throws", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ id: "r1" }) as never);
        prismaMock.userRole.update.mockRejectedValue(new Error("boom"));
        const res = await updateRole("r1", { name: "X", allowedPaths: [] });
        expect(res).toEqual({ success: false, error: "Kunne ikke oppdatere rolle." });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await updateRole("r1", { name: "X", allowedPaths: [] });
        expect(res.success).toBe(false);
    });
});

describe("roles.deleteRole", () => {
    it("returns not-found when the role is missing", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(null as never);
        const res = await deleteRole("missing");
        expect(res).toEqual({ success: false, error: "Rolle ikke funnet." });
        expect(prismaMock.userRole.delete).not.toHaveBeenCalled();
    });

    it("refuses to delete a system role", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(
            makeUserRole({ id: "r_sys", isSystem: true, _count: { members: 0 } }) as never
        );
        const res = await deleteRole("r_sys");
        expect(res).toEqual({ success: false, error: "Kan ikke slette systemroller." });
        expect(prismaMock.userRole.delete).not.toHaveBeenCalled();
    });

    it("refuses to delete a role that still has members", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(
            makeUserRole({ id: "r1", isSystem: false, _count: { members: 3 } }) as never
        );
        const res = await deleteRole("r1");
        expect(res).toEqual({ success: false, error: "Kan ikke slette rolle som har medlemmer." });
        expect(prismaMock.userRole.delete).not.toHaveBeenCalled();
    });

    it("deletes a non-system, member-less role and revalidates", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(
            makeUserRole({ id: "r1", isSystem: false, _count: { members: 0 } }) as never
        );
        prismaMock.userRole.delete.mockResolvedValue(makeUserRole({ id: "r1" }) as never);

        const res = await deleteRole("r1");

        expect(res).toEqual({ success: true });
        expect(prismaMock.userRole.delete).toHaveBeenCalledWith({ where: { id: "r1" } });
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/system/user-roles");
    });

    it("returns an error when delete throws", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(
            makeUserRole({ id: "r1", isSystem: false, _count: { members: 0 } }) as never
        );
        prismaMock.userRole.delete.mockRejectedValue(new Error("boom"));
        const res = await deleteRole("r1");
        expect(res).toEqual({ success: false, error: "Kunne ikke slette rolle." });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await deleteRole("r1");
        expect(res.success).toBe(false);
        expect(prismaMock.userRole.findUnique).not.toHaveBeenCalled();
    });
});

describe("roles.assignRole", () => {
    beforeEach(() => {
        prismaMock.member.update.mockResolvedValue({ clerkId: "clerk_x" } as never);
    });

    it("returns not-found when the role does not exist", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(null as never);
        const res = await assignRole("m1", "missing");
        expect(res).toEqual({ success: false, error: "Rolle ikke funnet." });
        expect(prismaMock.member.update).not.toHaveBeenCalled();
    });

    it("assigns an 'Admin' role and syncs the legacy ADMIN enum", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ id: "r_admin", name: "Admin" }) as never);

        const res = await assignRole("m1", "r_admin");

        expect(res).toEqual({ success: true });
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: "m1" },
                data: { userRoleId: "r_admin", role: "ADMIN" }
            })
        );
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users");
    });

    it("assigns a 'Moderator' role -> MODERATOR enum", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ id: "r_mod", name: "Moderator" }) as never);
        await assignRole("m1", "r_mod");
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { userRoleId: "r_mod", role: "MODERATOR" } })
        );
    });

    it("assigns any other role -> MEMBER enum", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ id: "r_ed", name: "Editor" }) as never);
        await assignRole("m1", "r_ed");
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { userRoleId: "r_ed", role: "MEMBER" } })
        );
    });

    it("normalizes case: lowercase 'admin' maps to the ADMIN enum", async () => {
        // assignRole now normalizes the role name (trim + toLowerCase) before mapping
        // to the legacy enum, so a stored name of "admin" still resolves to Role.ADMIN.
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ id: "r_a", name: "admin" }) as never);
        await assignRole("m1", "r_a");
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { userRoleId: "r_a", role: "ADMIN" } })
        );
    });

    it("normalizes surrounding whitespace and case: '  Admin  ' maps to ADMIN", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ id: "r_a2", name: "  Admin  " }) as never);
        await assignRole("m1", "r_a2");
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { userRoleId: "r_a2", role: "ADMIN" } })
        );
    });

    it("normalizes uppercase 'MODERATOR' to the MODERATOR enum", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ id: "r_m2", name: "MODERATOR" }) as never);
        await assignRole("m1", "r_m2");
        expect(prismaMock.member.update).toHaveBeenCalledWith(
            expect.objectContaining({ data: { userRoleId: "r_m2", role: "MODERATOR" } })
        );
    });

    it("surfaces a warning when Clerk sync fails", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ id: "r_ed", name: "Editor" }) as never);
        vi.mocked(clerkClient).mockResolvedValueOnce({
            users: { updateUserMetadata: vi.fn(async () => { throw new Error("clerk down"); }) }
        } as never);

        const res = await assignRole("m1", "r_ed");

        expect(res.success).toBe(true);
        expect((res as { warning?: string }).warning).toBeTruthy();
    });

    it("does not warn when the member has no clerkId (sync skipped)", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ id: "r_ed", name: "Editor" }) as never);
        prismaMock.member.update.mockResolvedValue({ clerkId: null } as never);

        const res = await assignRole("m1", "r_ed");

        expect(res).toEqual({ success: true });
    });

    it("returns an error when the member update throws", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ name: "Editor" }) as never);
        prismaMock.member.update.mockRejectedValue(new Error("boom"));
        const res = await assignRole("ghost", "r_ed");
        expect(res).toEqual({ success: false, error: "Kunne ikke tildele rolle." });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await assignRole("m1", "r_ed");
        expect(res.success).toBe(false);
        expect(prismaMock.userRole.findUnique).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// membership-types.ts
// ---------------------------------------------------------------------------

describe("membership-types.getMembershipTypes", () => {
    it("returns types with member counts derived from a groupBy", async () => {
        prismaMock.membershipType.findMany.mockResolvedValue([
            makeMembershipType({ name: "STANDARD", fee: 750 }),
            makeMembershipType({ name: "HONORARY", fee: 0 })
        ] as never);
        prismaMock.member.groupBy.mockResolvedValue([
            { membershipType: "STANDARD", _count: { _all: 5 } }
        ] as never);

        const res = await getMembershipTypes();

        expect(res.success).toBe(true);
        const data = (res as { data: Array<{ name: string; _count: { members: number } }> }).data;
        expect(data.find((d) => d.name === "STANDARD")?._count.members).toBe(5);
        // No group entry for HONORARY -> count defaults to 0.
        expect(data.find((d) => d.name === "HONORARY")?._count.members).toBe(0);
        expect(prismaMock.member.groupBy).toHaveBeenCalledWith(
            expect.objectContaining({ where: { deletedAt: null } })
        );
    });

    it("handles an empty type list", async () => {
        prismaMock.membershipType.findMany.mockResolvedValue([] as never);
        prismaMock.member.groupBy.mockResolvedValue([] as never);
        const res = await getMembershipTypes();
        expect(res.success).toBe(true);
        expect((res as { data: unknown[] }).data).toEqual([]);
    });

    it("returns an error when a query fails", async () => {
        prismaMock.membershipType.findMany.mockRejectedValue(new Error("boom"));
        const res = await getMembershipTypes();
        expect(res).toEqual({ success: false, error: "Kunne ikke hente medlemstyper." });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await getMembershipTypes();
        expect(res.success).toBe(false);
    });
});

describe("membership-types.createMembershipType", () => {
    it("creates a type with a fee default of zero and revalidates", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValue(null as never);
        prismaMock.membershipType.create.mockResolvedValue(makeMembershipType() as never);

        const res = await createMembershipType({ name: "HONORARY", description: "Free", fee: 0 });

        expect(res).toEqual({ success: true });
        expect(prismaMock.membershipType.create).toHaveBeenCalledWith({
            data: { name: "HONORARY", description: "Free", fee: 0 }
        });
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/system/membership-types");
    });

    it("creates a type with a positive fee", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValue(null as never);
        prismaMock.membershipType.create.mockResolvedValue(makeMembershipType() as never);
        const res = await createMembershipType({ name: "PREMIUM", fee: 1500 });
        expect(res.success).toBe(true);
        expect(prismaMock.membershipType.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ fee: 1500 }) })
        );
    });

    it("rejects a duplicate name without creating", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValue(makeMembershipType({ name: "STANDARD" }) as never);
        const res = await createMembershipType({ name: "STANDARD", fee: 750 });
        expect(res).toEqual({ success: false, error: "En medlemstype med dette navnet finnes allerede." });
        expect(prismaMock.membershipType.create).not.toHaveBeenCalled();
    });

    it("returns an error when create throws", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValue(null as never);
        prismaMock.membershipType.create.mockRejectedValue(new Error("boom"));
        const res = await createMembershipType({ name: "X", fee: 1 });
        expect(res).toEqual({ success: false, error: "Kunne ikke opprette medlemstype." });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await createMembershipType({ name: "X", fee: 1 });
        expect(res.success).toBe(false);
        expect(prismaMock.membershipType.findUnique).not.toHaveBeenCalled();
    });
});

describe("membership-types.updateMembershipType", () => {
    it("returns not-found when the type does not exist", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValue(null as never);
        const res = await updateMembershipType("missing", { name: "X", fee: 1 });
        expect(res).toEqual({ success: false, error: "Fant ikke medlemstype." });
        expect(prismaMock.membershipType.update).not.toHaveBeenCalled();
    });

    it("updates fee/description without a name change and does NOT cascade to members", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValueOnce(
            makeMembershipType({ id: "t1", name: "STANDARD", fee: 750 }) as never
        );
        prismaMock.membershipType.update.mockResolvedValue(makeMembershipType({ id: "t1" }) as never);

        const res = await updateMembershipType("t1", { name: "STANDARD", description: "d", fee: 800 });

        expect(res).toEqual({ success: true });
        expect(prismaMock.membershipType.update).toHaveBeenCalledWith({
            where: { id: "t1" },
            data: { name: "STANDARD", description: "d", fee: 800 }
        });
        // Name unchanged -> no member cascade.
        expect(prismaMock.member.updateMany).not.toHaveBeenCalled();
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/system/membership-types");
    });

    it("cascades the rename to all members holding the old type string", async () => {
        // First findUnique: the current record by id. Second findUnique: name-collision check (none).
        prismaMock.membershipType.findUnique
            .mockResolvedValueOnce(makeMembershipType({ id: "t1", name: "OLD" }) as never)
            .mockResolvedValueOnce(null as never);
        prismaMock.membershipType.update.mockResolvedValue(makeMembershipType({ id: "t1" }) as never);
        prismaMock.member.updateMany.mockResolvedValue({ count: 4 } as never);

        const res = await updateMembershipType("t1", { name: "NEW", fee: 750 });

        expect(res.success).toBe(true);
        expect(prismaMock.member.updateMany).toHaveBeenCalledWith({
            where: { membershipType: "OLD" },
            data: { membershipType: "NEW" }
        });
    });

    it("rejects a rename that collides with an existing type name", async () => {
        prismaMock.membershipType.findUnique
            .mockResolvedValueOnce(makeMembershipType({ id: "t1", name: "OLD" }) as never)
            .mockResolvedValueOnce(makeMembershipType({ id: "t2", name: "TAKEN" }) as never);

        const res = await updateMembershipType("t1", { name: "TAKEN", fee: 750 });

        expect(res).toEqual({ success: false, error: "Navnet er allerede i bruk." });
        expect(prismaMock.membershipType.update).not.toHaveBeenCalled();
        expect(prismaMock.member.updateMany).not.toHaveBeenCalled();
    });

    it("returns an error when the transaction throws", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValueOnce(
            makeMembershipType({ id: "t1", name: "STANDARD" }) as never
        );
        prismaMock.membershipType.update.mockRejectedValue(new Error("boom"));
        const res = await updateMembershipType("t1", { name: "STANDARD", fee: 800 });
        expect(res).toEqual({ success: false, error: "Kunne ikke oppdatere medlemstype." });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await updateMembershipType("t1", { name: "X", fee: 1 });
        expect(res.success).toBe(false);
        expect(prismaMock.membershipType.findUnique).not.toHaveBeenCalled();
    });
});

describe("membership-types.deleteMembershipType", () => {
    it("returns not-found when the type does not exist", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValue(null as never);
        const res = await deleteMembershipType("missing");
        expect(res).toEqual({ success: false, error: "Fant ikke medlemstype." });
        expect(prismaMock.membershipType.delete).not.toHaveBeenCalled();
    });

    it("refuses to delete a type still used by members", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValue(
            makeMembershipType({ id: "t1", name: "STANDARD" }) as never
        );
        prismaMock.member.count.mockResolvedValue(7 as never);

        const res = await deleteMembershipType("t1");

        expect(res.success).toBe(false);
        expect((res as { error: string }).error).toContain("7");
        expect(prismaMock.member.count).toHaveBeenCalledWith({
            where: { membershipType: "STANDARD", deletedAt: null }
        });
        expect(prismaMock.membershipType.delete).not.toHaveBeenCalled();
    });

    it("deletes an unused type and revalidates", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValue(
            makeMembershipType({ id: "t1", name: "OLD" }) as never
        );
        prismaMock.member.count.mockResolvedValue(0 as never);
        prismaMock.membershipType.delete.mockResolvedValue(makeMembershipType({ id: "t1" }) as never);

        const res = await deleteMembershipType("t1");

        expect(res).toEqual({ success: true });
        expect(prismaMock.membershipType.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/system/membership-types");
    });

    it("returns an error when delete throws", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValue(
            makeMembershipType({ id: "t1", name: "OLD" }) as never
        );
        prismaMock.member.count.mockResolvedValue(0 as never);
        prismaMock.membershipType.delete.mockRejectedValue(new Error("boom"));
        const res = await deleteMembershipType("t1");
        expect(res).toEqual({ success: false, error: "Kunne ikke slette medlemstype." });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await deleteMembershipType("t1");
        expect(res.success).toBe(false);
        expect(prismaMock.membershipType.findUnique).not.toHaveBeenCalled();
    });
});

describe("membership-types.seedDefaultTypes", () => {
    it("creates only the defaults that do not already exist", async () => {
        // STANDARD exists; the other three are missing.
        prismaMock.membershipType.findUnique
            .mockResolvedValueOnce(makeMembershipType({ name: "STANDARD" }) as never) // STANDARD exists
            .mockResolvedValueOnce(null as never) // HONORARY
            .mockResolvedValueOnce(null as never) // SUPPORT
            .mockResolvedValueOnce(null as never); // TRIAL
        prismaMock.membershipType.create.mockResolvedValue(makeMembershipType() as never);

        const res = await seedDefaultTypes();

        expect(res.success).toBe(true);
        expect((res as { message: string }).message).toContain("3");
        expect(prismaMock.membershipType.create).toHaveBeenCalledTimes(3);
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/system/membership-types");
    });

    it("creates all four defaults when none exist", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValue(null as never);
        prismaMock.membershipType.create.mockResolvedValue(makeMembershipType() as never);

        const res = await seedDefaultTypes();

        expect(res.success).toBe(true);
        expect(prismaMock.membershipType.create).toHaveBeenCalledTimes(4);
        // The HONORARY default carries a zero fee.
        const honorary = prismaMock.membershipType.create.mock.calls
            .map((c) => (c[0] as { data: { name: string; fee: number } }).data)
            .find((d) => d.name === "HONORARY");
        expect(honorary?.fee).toBe(0);
    });

    it("skips revalidation when shouldRevalidate is false", async () => {
        prismaMock.membershipType.findUnique.mockResolvedValue(makeMembershipType() as never);

        const res = await seedDefaultTypes(false);

        expect(res.success).toBe(true);
        expect(prismaMock.membershipType.create).not.toHaveBeenCalled();
        expect(revalidatePathMock).not.toHaveBeenCalled();
    });

    it("returns an error when seeding throws", async () => {
        prismaMock.membershipType.findUnique.mockRejectedValue(new Error("boom"));
        const res = await seedDefaultTypes();
        expect(res).toEqual({ success: false, error: "Failed to seed." });
    });

    it("denies an unauthorized caller", async () => {
        denyRole();
        const res = await seedDefaultTypes();
        expect(res.success).toBe(false);
        expect(prismaMock.membershipType.create).not.toHaveBeenCalled();
    });
});
