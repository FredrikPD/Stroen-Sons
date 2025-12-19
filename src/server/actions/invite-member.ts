"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { clerkClient } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";

const InviteMemberSchema = z.object({
    firstName: z.string().min(1, "Fornavn er påkrevd"),
    lastName: z.string().min(1, "Etternavn er påkrevd"),
    email: z.string().email("Ugyldig e-postadresse"),
    password: z.string().min(8, "Passordet må være minst 8 tegn"),
    role: z.nativeEnum(Role),
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
    const validatedFields = InviteMemberSchema.safeParse({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        email: formData.get("email"),
        password: formData.get("password"),
        role: formData.get("role"),
        membershipType: formData.get("membershipType"),
    });

    if (!validatedFields.success) {
        return {
            error: "Validering feilet",
            fieldErrors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { firstName, lastName, email, password, role, membershipType } = validatedFields.data;

    try {
        // 1. Create user in Clerk
        const client = await clerkClient();

        // Check if user already exists in Clerk to avoid cryptic errors (though Clerk handles this, custom handling is nice)
        // For now we trust the create call to throw.

        const clerkUser = await client.users.createUser({
            firstName,
            lastName,
            emailAddress: [email],
            password,
            publicMetadata: {
                role,
            },
        });

        // 2. Create user in Prisma
        await db.member.create({
            data: {
                clerkId: clerkUser.id,
                email: email,
                firstName,
                lastName,
                role,
                membershipType,
            },
        });

        return { message: "Medlem invitert og opprettet!" };
    } catch (err) {
        console.error("Failed to invite member:", err);

        // Simple error handling for common cases
        const errorMessage = err instanceof Error ? err.message : "En ukjent feil oppstod";

        if (errorMessage.includes("already exists")) {
            return { error: "En bruker med denne e-posten finnes allerede." };
        }

        return { error: errorMessage };
    }
}
