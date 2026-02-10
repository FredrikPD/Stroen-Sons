"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { clerkClient } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { ensureMember } from "@/server/auth/ensureMember";

const InviteMemberSchema = z.object({
    firstName: z.string().min(1, "Fornavn er påkrevd"),
    lastName: z.string().min(1, "Etternavn er påkrevd"),
    email: z.string().email("Ugyldig e-postadresse"),
    roleId: z.string().min(1, "Rolle er påkrevd"),
    membershipType: z.string().min(1, "Medlemskapstype er påkrevd"),
});

export type InviteMemberState = {
    message?: string;
    error?: string;
    fieldErrors?: {
        [key: string]: string[] | undefined;
    };
};

export async function inviteMember(prevState: InviteMemberState, formData: FormData): Promise<InviteMemberState> {
    const member = await ensureMember();
    // Use checkAccess or just check admin role here? 
    // Ideally checkAccess(member.userRole, '/admin/users/invite') but for now let's stick to legacy or simple check.
    if (member.role !== "ADMIN") return { error: "Du har ikke tilgang til å invitere nye medlemmer." };

    const validatedFields = InviteMemberSchema.safeParse({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        email: formData.get("email"),
        roleId: formData.get("roleId"),
        membershipType: formData.get("membershipType"),
    });

    if (!validatedFields.success) {
        return {
            error: "Validering feilet",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { firstName, lastName, email, roleId, membershipType } = validatedFields.data;

    // 1. Check if user already exists in DB
    const existingMember = await db.member.findUnique({
        where: { email },
    });

    if (existingMember) {
        return { error: "En bruker med denne e-posten finnes allerede i systemet." };
    }

    // Fetch the Role to map to legacy enum
    const userRole = await db.userRole.findUnique({ where: { id: roleId } });
    if (!userRole) return { error: "Ugyldig rolle valgt." };

    let legacyRole: Role = Role.MEMBER;
    if (userRole.name === "Admin") legacyRole = Role.ADMIN;
    if (userRole.name === "Moderator") legacyRole = Role.MODERATOR;

    try {
        const client = await clerkClient();

        // 2. Create Invitation in Clerk
        console.log("Creating invitation for:", email);
        try {
            await client.invitations.createInvitation({
                emailAddress: email,
                publicMetadata: {
                    role: legacyRole, // Clerk metadata still uses legacy role as string? Or update to use roleId? 
                    // Let's keep legacy role for now to not break other Clerk integrations.
                    roleId: userRole.id,
                    source: "admin_invite"
                },
                ignoreExisting: true,
            });
        } catch (clerkError: any) {
            const msg = clerkError?.errors?.[0]?.message || clerkError?.message || "Feil med Clerk invitasjon";
            if (msg.includes("already exists")) {
                return { error: "Denne brukern er allerede invitert eller finnes hos Clerk." };
            }
            throw clerkError;
        }

        // 3. Create PENDING user in Prisma
        try {
            await db.member.create({
                data: {
                    clerkId: null,
                    email: email,
                    firstName,
                    lastName,
                    role: legacyRole,
                    userRoleId: userRole.id, // Link Dynamic Role
                    membershipType,
                    status: "PENDING"
                },
            });
        } catch (prismaError) {
            console.error("Prisma creation failed:", prismaError);
            throw new Error("Kunne ikke lagre bruker i databasen.");
        }

        return { message: "Invitasjon sendt og bruker opprettet som ventende!" };
    } catch (err) {
        console.error("Failed to invite member:", err);
        return { error: err instanceof Error ? err.message : "En ukjent feil oppstod ved invitasjon." };
    }
}
