"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { clerkClient } from "@clerk/nextjs/server";
import { Role } from "@prisma/client";
import { Resend } from "resend";
import WelcomeEmail from "@/components/emails/welcome-email";
import { render } from "@react-email/render";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // 1. Check if user already exists in DB
    const existingMember = await db.member.findUnique({
        where: { email },
    });

    if (existingMember) {
        return { error: "En bruker med denne e-posten finnes allerede i systemet." };
    }

    let clerkUser;

    try {
        // 2. Create user in Clerk
        const client = await clerkClient();

        // Check if user exists in Clerk explicitly before trying to create
        const existingClerkUsers = await client.users.getUserList({
            emailAddress: [email],
            limit: 1,
        });

        if (existingClerkUsers.data.length > 0) {
            return { error: "En bruker med denne e-posten finnes allerede hos Clerk (kan være en inaktiv bruker)." };
        }

        try {
            clerkUser = await client.users.createUser({
                firstName,
                lastName,
                emailAddress: [email],
                password,
                publicMetadata: {
                    role,
                },
            });
        } catch (clerkError: any) {
            // Check for specific Clerk error codes if possible, or string match
            const msg = clerkError?.errors?.[0]?.message || clerkError?.message || "Feil med Clerk brukerregistrering";
            if (msg.includes("already exists") || msg.includes("identifier_exists")) {
                return { error: "Denne e-posten er allerede registrert hos Clerk (kan være en inaktiv bruker)." };
            }
            throw clerkError;
        }

        // 3. Create user in Prisma
        try {
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
        } catch (prismaError) {
            console.error("Prisma creation failed, rolling back Clerk user:", prismaError);
            // ROLLBACK: Delete the just-created Clerk user to maintain consistency
            await client.users.deleteUser(clerkUser.id);
            throw new Error("Kunne ikke lagre bruker i databasen. Clerk-bruker er rullet tilbake.");
        }



        // 3. Send invite email
        try {
            const emailHtml = await render(
                WelcomeEmail({
                    firstName,
                    email,
                    password,
                    loginUrl: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/sign-in` : "https://stroen-sons.com/sign-in"
                })
            );

            await resend.emails.send({
                from: 'Strøen & Sønner <onboarding@resend.dev>', // UPDATE THIS with verified domain later if available
                to: [email],
                subject: 'Velkommen til Strøen & Sønner',
                html: emailHtml,
            });
        } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
            // We don't throw here because the user is already created
            // You might want to return a warning message instead
        }

        return { message: "Medlem invitert og opprettet! E-post er sendt." };
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
