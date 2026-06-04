import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../helpers/prisma";
import { makeMember, makeUserRole } from "../../helpers/fixtures";
import { loginAsAdmin, loginAsMember, logout, ensureRoleMock } from "../../helpers/auth";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { getInvitations, revokeInvitation } from "@/server/actions/invitations";
import { inviteMember } from "@/server/actions/invite-member";
import { deleteMember } from "@/server/actions/delete-member";

const clerkClientMock = vi.mocked(clerkClient);
const revalidatePathMock = vi.mocked(revalidatePath);

/**
 * Build a controlled Clerk client whose inner methods are vi.fn()s we can assert on,
 * and point the global `clerkClient` mock at it for the duration of a test.
 */
function stubClerkClient(over: {
    invitations?: Partial<{
        getInvitationList: ReturnType<typeof vi.fn>;
        revokeInvitation: ReturnType<typeof vi.fn>;
        createInvitation: ReturnType<typeof vi.fn>;
    }>;
    users?: Partial<{ deleteUser: ReturnType<typeof vi.fn> }>;
} = {}) {
    const client = {
        invitations: {
            getInvitationList: over.invitations?.getInvitationList ?? vi.fn(async () => ({ data: [], totalCount: 0 })),
            revokeInvitation: over.invitations?.revokeInvitation ?? vi.fn(async () => ({})),
            createInvitation: over.invitations?.createInvitation ?? vi.fn(async () => ({ id: "inv_1" }))
        },
        users: {
            deleteUser: over.users?.deleteUser ?? vi.fn(async () => ({}))
        }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clerkClientMock.mockResolvedValue(client as any);
    return client;
}

/** Helper to construct a FormData payload from a plain object. */
function fd(entries: Record<string, string | null>) {
    const f = new FormData();
    for (const [k, v] of Object.entries(entries)) {
        if (v !== null) f.set(k, v);
    }
    return f;
}

const clerkInvitation = (over: Record<string, unknown> = {}) => ({
    id: "inv_1",
    emailAddress: "new@example.com",
    publicMetadata: { role: "MEMBER" },
    status: "pending",
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...over
});

// ---------------------------------------------------------------------------
// getInvitations
// ---------------------------------------------------------------------------
describe("getInvitations", () => {
    it("returns the mapped pending invitations for an admin", async () => {
        loginAsAdmin();
        const client = stubClerkClient({
            invitations: {
                getInvitationList: vi.fn(async () => ({
                    data: [
                        clerkInvitation({
                            id: "inv_a",
                            emailAddress: "a@example.com",
                            publicMetadata: { role: "ADMIN" },
                            createdAt: 111,
                            updatedAt: 222
                        }),
                        clerkInvitation({ id: "inv_b", emailAddress: "b@example.com", publicMetadata: {} })
                    ],
                    totalCount: 2
                }))
            }
        });

        const res = await getInvitations();

        expect(res.success).toBe(true);
        expect(client.invitations.getInvitationList).toHaveBeenCalledWith({ status: "pending" });
        expect(res.invitations).toEqual([
            { id: "inv_a", email: "a@example.com", role: "ADMIN", status: "pending", createdAt: 111, updatedAt: 222 },
            {
                id: "inv_b",
                email: "b@example.com",
                role: "MEMBER", // falls back when publicMetadata.role is missing
                status: "pending",
                createdAt: 1700000000000,
                updatedAt: 1700000001000
            }
        ]);
    });

    it("returns an empty list when there are no pending invitations", async () => {
        loginAsAdmin();
        stubClerkClient();
        const res = await getInvitations();
        expect(res.success).toBe(true);
        expect(res.invitations).toEqual([]);
    });

    it("fails (caught) when the caller is not an admin", async () => {
        logout(); // ensureRole rejects
        stubClerkClient();
        const res = await getInvitations();
        expect(res).toEqual({ success: false, error: "Kunne ikke hente invitasjoner." });
    });

    it("requests the ADMIN role via ensureRole", async () => {
        loginAsAdmin();
        stubClerkClient();
        await getInvitations();
        expect(ensureRoleMock).toHaveBeenCalledWith(["ADMIN"]);
    });

    it("returns an error response when the Clerk call throws", async () => {
        loginAsAdmin();
        stubClerkClient({
            invitations: {
                getInvitationList: vi.fn(async () => {
                    throw new Error("clerk down");
                })
            }
        });
        const res = await getInvitations();
        expect(res).toEqual({ success: false, error: "Kunne ikke hente invitasjoner." });
    });
});

// ---------------------------------------------------------------------------
// revokeInvitation
// ---------------------------------------------------------------------------
describe("revokeInvitation", () => {
    it("revokes the invitation, deletes pending members and revalidates", async () => {
        loginAsAdmin();
        prismaMock.member.deleteMany.mockResolvedValue({ count: 1 } as never);
        const client = stubClerkClient({
            invitations: {
                getInvitationList: vi.fn(async () => ({
                    data: [clerkInvitation({ id: "inv_target", emailAddress: "revoke@example.com" })],
                    totalCount: 1
                }))
            }
        });

        const res = await revokeInvitation("inv_target");

        expect(res).toEqual({ success: true });
        expect(prismaMock.member.deleteMany).toHaveBeenCalledWith({
            where: { email: "revoke@example.com", status: "PENDING" }
        });
        expect(client.invitations.revokeInvitation).toHaveBeenCalledWith("inv_target");
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/system/invitations");
    });

    it("returns not-found when the invitation id is not in the pending list", async () => {
        loginAsAdmin();
        const client = stubClerkClient({
            invitations: {
                getInvitationList: vi.fn(async () => ({
                    data: [clerkInvitation({ id: "other" })],
                    totalCount: 1
                }))
            }
        });

        const res = await revokeInvitation("missing");

        expect(res).toEqual({ success: false, error: "Invitasjonen ble ikke funnet." });
        expect(prismaMock.member.deleteMany).not.toHaveBeenCalled();
        expect(client.invitations.revokeInvitation).not.toHaveBeenCalled();
    });

    it("fails (caught) for a non-admin caller", async () => {
        logout(); // ensureRole rejects
        const client = stubClerkClient();
        const res = await revokeInvitation("inv_target");
        expect(res).toEqual({ success: false, error: "Kunne ikke trekke tilbake invitasjonen." });
        expect(client.invitations.revokeInvitation).not.toHaveBeenCalled();
    });

    it("returns a caught error when the Clerk revoke throws", async () => {
        loginAsAdmin();
        prismaMock.member.deleteMany.mockResolvedValue({ count: 0 } as never);
        stubClerkClient({
            invitations: {
                getInvitationList: vi.fn(async () => ({
                    data: [clerkInvitation({ id: "inv_target", emailAddress: "x@example.com" })],
                    totalCount: 1
                })),
                revokeInvitation: vi.fn(async () => {
                    throw new Error("clerk revoke failed");
                })
            }
        });

        const res = await revokeInvitation("inv_target");
        expect(res).toEqual({ success: false, error: "Kunne ikke trekke tilbake invitasjonen." });
    });
});

// ---------------------------------------------------------------------------
// inviteMember
// ---------------------------------------------------------------------------
describe("inviteMember", () => {
    const validForm = () =>
        fd({
            firstName: "Ola",
            lastName: "Nordmann",
            email: "Ola.Nordmann@Example.com",
            roleId: "role_member",
            membershipType: "STANDARD"
        });

    beforeEach(() => {
        loginAsAdmin();
        prismaMock.member.findUnique.mockResolvedValue(null as never);
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ id: "role_member", name: "Member" }) as never);
        prismaMock.member.create.mockResolvedValue(makeMember() as never);
    });

    it("creates a Clerk invitation and a PENDING member on the happy path", async () => {
        const client = stubClerkClient();

        const res = await inviteMember({}, validForm());

        expect(res).toEqual({ message: "Invitasjon sendt og bruker opprettet som ventende!" });
        // Email is lower-cased before any lookup / creation.
        expect(prismaMock.member.findUnique).toHaveBeenCalledWith({ where: { email: "ola.nordmann@example.com" } });
        expect(client.invitations.createInvitation).toHaveBeenCalledWith(
            expect.objectContaining({
                emailAddress: "ola.nordmann@example.com",
                ignoreExisting: true,
                publicMetadata: expect.objectContaining({ role: "MEMBER", roleId: "role_member", source: "admin_invite" })
            })
        );
        expect(prismaMock.member.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    clerkId: null,
                    email: "ola.nordmann@example.com",
                    firstName: "Ola",
                    lastName: "Nordmann",
                    role: "MEMBER",
                    userRoleId: "role_member",
                    membershipType: "STANDARD",
                    status: "PENDING"
                })
            })
        );
    });

    it("maps the dynamic role name 'Admin' to the legacy ADMIN enum", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ id: "role_admin", name: "Admin" }) as never);
        const client = stubClerkClient();

        await inviteMember({}, fd({
            firstName: "A",
            lastName: "B",
            email: "admin@example.com",
            roleId: "role_admin",
            membershipType: "STANDARD"
        }));

        expect(client.invitations.createInvitation).toHaveBeenCalledWith(
            expect.objectContaining({ publicMetadata: expect.objectContaining({ role: "ADMIN" }) })
        );
        expect(prismaMock.member.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ role: "ADMIN" }) })
        );
    });

    it("maps the dynamic role name 'Moderator' to the legacy MODERATOR enum", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(makeUserRole({ id: "role_mod", name: "Moderator" }) as never);
        stubClerkClient();

        await inviteMember({}, fd({
            firstName: "A",
            lastName: "B",
            email: "mod@example.com",
            roleId: "role_mod",
            membershipType: "STANDARD"
        }));

        expect(prismaMock.member.create).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ role: "MODERATOR" }) })
        );
    });

    it("rejects a non-admin caller before doing any work", async () => {
        loginAsMember();
        const client = stubClerkClient();

        const res = await inviteMember({}, validForm());

        expect(res).toEqual({ error: "Du har ikke tilgang til å invitere nye medlemmer." });
        expect(prismaMock.member.findUnique).not.toHaveBeenCalled();
        expect(client.invitations.createInvitation).not.toHaveBeenCalled();
        expect(prismaMock.member.create).not.toHaveBeenCalled();
    });

    it("returns field errors when validation fails (missing fields)", async () => {
        stubClerkClient();
        const res = await inviteMember({}, fd({ firstName: "", lastName: "", email: "not-an-email", roleId: "", membershipType: "" }));

        expect(res.error).toBe("Validering feilet");
        expect(res.fieldErrors).toBeDefined();
        expect(res.fieldErrors?.email).toBeDefined();
        expect(res.fieldErrors?.firstName).toBeDefined();
        expect(prismaMock.member.create).not.toHaveBeenCalled();
    });

    it("blocks an email that already belongs to an active (non-deleted) member", async () => {
        prismaMock.member.findUnique.mockResolvedValue(makeMember({ email: "ola.nordmann@example.com", deletedAt: null }) as never);
        const client = stubClerkClient();

        const res = await inviteMember({}, validForm());

        expect(res).toEqual({ error: "En bruker med denne e-posten finnes allerede i systemet." });
        expect(client.invitations.createInvitation).not.toHaveBeenCalled();
        expect(prismaMock.member.create).not.toHaveBeenCalled();
    });

    it("allows reusing the email of a soft-deleted member", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ email: "ola.nordmann@example.com", deletedAt: new Date("2026-01-01T00:00:00.000Z") }) as never
        );
        const client = stubClerkClient();

        const res = await inviteMember({}, validForm());

        expect(res).toEqual({ message: "Invitasjon sendt og bruker opprettet som ventende!" });
        expect(client.invitations.createInvitation).toHaveBeenCalled();
        expect(prismaMock.member.create).toHaveBeenCalled();
    });

    it("returns an error when the selected role does not exist", async () => {
        prismaMock.userRole.findUnique.mockResolvedValue(null as never);
        const client = stubClerkClient();

        const res = await inviteMember({}, validForm());

        expect(res).toEqual({ error: "Ugyldig rolle valgt." });
        expect(client.invitations.createInvitation).not.toHaveBeenCalled();
    });

    it("surfaces a friendly message when Clerk reports the user already exists", async () => {
        const createInvitation = vi.fn(async () => {
            const err: any = new Error("wrapper");
            err.errors = [{ message: "Invitation already exists for this email" }];
            throw err;
        });
        stubClerkClient({ invitations: { createInvitation } });

        const res = await inviteMember({}, validForm());

        expect(res).toEqual({ error: "Denne brukern er allerede invitert eller finnes hos Clerk." });
        expect(prismaMock.member.create).not.toHaveBeenCalled();
    });

    it("returns a generic error when Clerk throws an unexpected error", async () => {
        const createInvitation = vi.fn(async () => {
            throw new Error("Clerk exploded");
        });
        stubClerkClient({ invitations: { createInvitation } });

        const res = await inviteMember({}, validForm());

        expect(res).toEqual({ error: "Clerk exploded" });
        expect(prismaMock.member.create).not.toHaveBeenCalled();
    });

    it("returns a DB save error when creating the Prisma member fails", async () => {
        stubClerkClient();
        prismaMock.member.create.mockRejectedValue(new Error("db write failed") as never);

        const res = await inviteMember({}, validForm());

        expect(res).toEqual({ error: "Kunne ikke lagre bruker i databasen." });
    });
});

// ---------------------------------------------------------------------------
// deleteMember
// ---------------------------------------------------------------------------
describe("deleteMember", () => {
    beforeEach(() => {
        loginAsAdmin();
        prismaMock.paymentRequest.deleteMany.mockResolvedValue({ count: 0 } as never);
        prismaMock.payment.deleteMany.mockResolvedValue({ count: 0 } as never);
        prismaMock.transaction.create.mockResolvedValue({} as never);
        prismaMock.member.update.mockResolvedValue(makeMember() as never);
    });

    it("soft-deletes and anonymizes a member with a clerk account and zero balance", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m_del", clerkId: "clerk_m_del", balance: 0, firstName: "Kari", lastName: "Hansen" }) as never
        );
        const client = stubClerkClient();

        const res = await deleteMember({}, fd({ memberId: "m_del" }));

        expect(res).toEqual({ message: "Medlemmet er deaktivert og personlig data er anonymisert." });

        // Revokes Clerk login.
        expect(client.users.deleteUser).toHaveBeenCalledWith("clerk_m_del");

        // Cleans up financial records.
        expect(prismaMock.paymentRequest.deleteMany).toHaveBeenCalledWith({ where: { memberId: "m_del" } });
        expect(prismaMock.payment.deleteMany).toHaveBeenCalledWith({ where: { memberId: "m_del" } });

        // No payout transaction for a zero balance.
        expect(prismaMock.transaction.create).not.toHaveBeenCalled();

        // Soft-delete write: deletedAt set, status INACTIVE, sensitive fields nulled, anonymized email, balance reset, fees paused.
        expect(prismaMock.member.update).toHaveBeenCalledTimes(1);
        const updateArg = prismaMock.member.update.mock.calls[0][0] as { where: unknown; data: Record<string, unknown> };
        expect(updateArg.where).toEqual({ id: "m_del" });
        expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
        expect(updateArg.data.status).toBe("INACTIVE");
        expect(updateArg.data.clerkId).toBeNull();
        expect(updateArg.data.email).toBe("deleted-m_del@removed.local");
        expect(updateArg.data.phoneNumber).toBeNull();
        expect(updateArg.data.address).toBeNull();
        expect(updateArg.data.zipCode).toBeNull();
        expect(updateArg.data.city).toBeNull();
        expect(updateArg.data.avatarUrl).toBeNull();
        expect(updateArg.data.balance).toBe(0);
        expect(updateArg.data.pauseMonthlyFees).toBe(true);

        // Revalidates the affected pages.
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users");
        expect(revalidatePathMock).toHaveBeenCalledWith("/admin/system/delete");
        expect(revalidatePathMock).toHaveBeenCalledWith("/members");
    });

    it("creates a negative payout transaction when the member has a positive balance", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m_pos", clerkId: "clerk_m_pos", balance: 125.5, firstName: "Per", lastName: "Olsen" }) as never
        );
        stubClerkClient();

        const res = await deleteMember({}, fd({ memberId: "m_pos" }));

        expect(res.message).toBeDefined();
        expect(prismaMock.transaction.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    amount: -125.5,
                    category: "MEMBER_EXIT",
                    memberId: "m_pos",
                    description: "Utbetaling av saldo ved utmelding: Per Olsen"
                })
            })
        );
    });

    it("does not create a payout transaction for a negative balance (member owes money)", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m_neg", clerkId: "clerk_m_neg", balance: -300 }) as never
        );
        stubClerkClient();

        await deleteMember({}, fd({ memberId: "m_neg" }));

        expect(prismaMock.transaction.create).not.toHaveBeenCalled();
        expect(prismaMock.member.update).toHaveBeenCalledTimes(1);
    });

    it("skips the Clerk deletion when the member has no clerkId", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m_noclerk", clerkId: null, balance: 0 }) as never
        );
        const client = stubClerkClient();

        const res = await deleteMember({}, fd({ memberId: "m_noclerk" }));

        expect(res.message).toBeDefined();
        expect(client.users.deleteUser).not.toHaveBeenCalled();
        expect(prismaMock.member.update).toHaveBeenCalledTimes(1);
    });

    it("continues the soft-delete even when Clerk reports the user is already gone (404)", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m_404", clerkId: "clerk_m_404", balance: 0 }) as never
        );
        const deleteUser = vi.fn(async () => {
            const err: any = new Error("not found");
            err.status = 404;
            throw err;
        });
        stubClerkClient({ users: { deleteUser } });

        const res = await deleteMember({}, fd({ memberId: "m_404" }));

        expect(res).toEqual({ message: "Medlemmet er deaktivert og personlig data er anonymisert." });
        expect(prismaMock.member.update).toHaveBeenCalledTimes(1);
    });

    it("continues the soft-delete when Clerk reports a resource_not_found error code", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m_rnf", clerkId: "clerk_m_rnf", balance: 0 }) as never
        );
        const deleteUser = vi.fn(async () => {
            const err: any = new Error("gone");
            err.errors = [{ code: "resource_not_found" }];
            throw err;
        });
        stubClerkClient({ users: { deleteUser } });

        const res = await deleteMember({}, fd({ memberId: "m_rnf" }));

        expect(res.message).toBeDefined();
        expect(prismaMock.member.update).toHaveBeenCalledTimes(1);
    });

    it("still soft-deletes when Clerk deletion fails with an unexpected error", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m_clerkerr", clerkId: "clerk_m_clerkerr", balance: 0 }) as never
        );
        const deleteUser = vi.fn(async () => {
            throw new Error("clerk 500");
        });
        stubClerkClient({ users: { deleteUser } });

        const res = await deleteMember({}, fd({ memberId: "m_clerkerr" }));

        // The unexpected-error branch only logs; the soft-delete still proceeds.
        expect(res).toEqual({ message: "Medlemmet er deaktivert og personlig data er anonymisert." });
        expect(prismaMock.member.update).toHaveBeenCalledTimes(1);
    });

    it("rejects a non-admin caller", async () => {
        loginAsMember();
        const client = stubClerkClient();

        const res = await deleteMember({}, fd({ memberId: "m_del" }));

        expect(res).toEqual({ error: "Du har ikke tilgang til å slette medlemmer." });
        expect(prismaMock.member.findUnique).not.toHaveBeenCalled();
        expect(client.users.deleteUser).not.toHaveBeenCalled();
        expect(prismaMock.member.update).not.toHaveBeenCalled();
    });

    it("returns an error when no memberId is provided", async () => {
        stubClerkClient();
        const res = await deleteMember({}, fd({ memberId: null }));
        expect(res).toEqual({ error: "Ingen medlems-ID oppgitt." });
        expect(prismaMock.member.findUnique).not.toHaveBeenCalled();
    });

    it("returns not-found when the member does not exist", async () => {
        prismaMock.member.findUnique.mockResolvedValue(null as never);
        stubClerkClient();

        const res = await deleteMember({}, fd({ memberId: "ghost" }));

        expect(res).toEqual({ error: "Fant ikke medlemmet i databasen." });
        expect(prismaMock.member.update).not.toHaveBeenCalled();
    });

    it("is idempotent — refuses to re-delete an already soft-deleted member", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m_already", deletedAt: new Date("2026-01-01T00:00:00.000Z") }) as never
        );
        stubClerkClient();

        const res = await deleteMember({}, fd({ memberId: "m_already" }));

        expect(res).toEqual({ error: "Medlemmet er allerede slettet." });
        expect(prismaMock.member.update).not.toHaveBeenCalled();
        expect(prismaMock.paymentRequest.deleteMany).not.toHaveBeenCalled();
    });

    it("returns a generic error when the soft-delete update throws", async () => {
        prismaMock.member.findUnique.mockResolvedValue(
            makeMember({ id: "m_fail", clerkId: "clerk_m_fail", balance: 0 }) as never
        );
        stubClerkClient();
        prismaMock.member.update.mockRejectedValue(new Error("db down") as never);

        const res = await deleteMember({}, fd({ memberId: "m_fail" }));

        expect(res).toEqual({ error: "En uventet feil oppstod under sletting." });
    });
});
