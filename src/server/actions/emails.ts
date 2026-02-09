"use server";

import { Resend } from "resend";
import { NewPostEmail } from "@/components/emails/new-post-email";
import { UpdatedPostEmail } from "@/components/emails/updated-post-email";
import { db } from "@/server/db";

const resend = new Resend(process.env.RESEND_API_KEY);

// Fallback email if domain verification is an issue, but usually 'onboarding@resend.dev' for testing
// In prod it should be a verified domain.
const FROM_EMAIL = "Strøen Søns <varsel@xn--strensns-74ad.no>";

interface SendPostNotificationParams {
    postTitle: string;
    postContent: string;
    authorName: string;
    postId: string;
    category: string;
}

export async function sendPostNotification({
    postTitle,
    postContent,
    authorName,
    postId,
    category
}: SendPostNotificationParams) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("Missing RESEND_API_KEY, skipping email notification");
        return { success: false, error: "Missing API Key" };
    }

    try {
        // Fetch all active members with email
        const members = await db.member.findMany({
            where: {
                status: "ACTIVE",
                email: { not: undefined } // Ensure email exists
            },
            select: { email: true }
        });

        if (members.length === 0) {
            return { success: true, count: 0 };
        }

        const emailList = members.map(m => m.email);
        const postUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://stroen-sons.com"}/posts/${postId}`;

        // Clean content for email preview (remove markdown roughly if needed, or just pass as is)
        // For simplicity we pass it as is, but ReactMarkdown in email might be complex. 
        // The template currently treats it as text. Let's strip markdown characters for the preview.
        const cleanContent = postContent
            .replace(/[#*`_]/g, '') // Simple strip
            .split('\n')[0]; // Just take first paragraph or line

        // Send methods:
        // 1. Batch sending (best for bulk)
        // 2. Loop (ok for small numbers)
        // 3. Bcc (privacy issues if not careful, but okay for "broadcast")

        // Resend recommends batching (max 100 per call for free/pro usually).
        // Let's split into chunks of 50 to be safe.

        const chunkSize = 50;
        const chunks = [];

        for (let i = 0; i < emailList.length; i += chunkSize) {
            chunks.push(emailList.slice(i, i + chunkSize));
        }

        let totalSent = 0;

        for (const chunk of chunks) {
            const { error } = await resend.emails.send({
                from: FROM_EMAIL,
                to: chunk, // We can put multiple recipients in 'to' or 'bcc'. 
                // IMPORTANT: If we put multiple in 'to', they might see each other? 
                // Resend documentation says: "Send an email to a single recipient or a list of recipients."
                // Usually it sends individual emails if passed as array, BUT we should double check behavior.
                // Safest for privacy is BCC or individual sends if we want "Hey <Name>".
                // Since our template says "Hei,", we can batch.
                // However, putting everyone in TO is bad practice if headers leak.
                // Resend treats array in 'to' as individual emails usually? 
                // Actually, Resend docs say: "To send a single email to multiple recipients, provide an array of strings."
                // Wait, if I want them NOT to see each other, I should use BCC or valid batching endpoint if it exists.
                // Or proper bulk sending. Resend has a 'batch' endpoint for different contents.
                // For identical content, passing array to 'to' sends ONE email with multiple recipients (visible to all).
                // WE MUST USE BCC or loop for individual notifications to hide recipients.

                // Let's us BCC for the broadcast to many, and put a generic "medlemmer@..." or the sender in TO.

                bcc: chunk,
                subject: `Nytt innlegg: ${postTitle}`,
                react: NewPostEmail({
                    postTitle,
                    postContent: cleanContent,
                    authorName,
                    postUrl,
                    category
                }),
            });

            if (error) {
                console.error("Resend error:", error);
            } else {
                totalSent += chunk.length;
            }
        }

        console.log(`Sent email notifications to ${totalSent} members`);
        return { success: true, count: totalSent };

    } catch (error) {
        console.error("Failed to send post notifications:", error);
        return { success: false, error };
    }
}

export async function sendPostUpdateNotification({
    postTitle,
    postContent,
    authorName,
    postId,
    category
}: SendPostNotificationParams) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("Missing RESEND_API_KEY, skipping email notification");
        return { success: false, error: "Missing API Key" };
    }

    try {
        const members = await db.member.findMany({
            where: {
                status: "ACTIVE",
                email: { not: undefined }
            },
            select: { email: true }
        });

        if (members.length === 0) {
            return { success: true, count: 0 };
        }

        const emailList = members.map(m => m.email);
        const postUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://stroen-sons.com"}/posts/${postId}`;

        const cleanContent = postContent
            .replace(/[#*`_]/g, '')
            .split('\n')[0];

        const chunkSize = 50;
        const chunks = [];

        for (let i = 0; i < emailList.length; i += chunkSize) {
            chunks.push(emailList.slice(i, i + chunkSize));
        }

        let totalSent = 0;

        for (const chunk of chunks) {
            const { error } = await resend.emails.send({
                from: FROM_EMAIL,
                to: chunk,
                bcc: chunk,
                subject: `Oppdatert innlegg: ${postTitle}`,
                react: UpdatedPostEmail({
                    postTitle,
                    postContent: cleanContent,
                    authorName,
                    postUrl,
                    category
                }),
            });

            if (error) {
                console.error("Resend error:", error);
            } else {
                totalSent += chunk.length;
            }
        }

        console.log(`Sent email notifications to ${totalSent} members`);
        return { success: true, count: totalSent };

    } catch (error) {
        console.error("Failed to send post update notifications:", error);
        return { success: false, error };
    }
}

import { PaymentReminderEmail } from "@/components/emails/payment-reminder-email";

/**
 * Send a reminder to a single member about specific unpaid invoices.
 */
export async function sendPaymentReminder(memberId: string, requestIds: string[]) {
    try {
        const member = await db.member.findUnique({
            where: { id: memberId },
            select: { email: true, firstName: true } // Assuming we have these fields
        });

        if (!member || !member.email) {
            return { success: false, error: "Member not found or missing email" };
        }

        const invoices = await db.paymentRequest.findMany({
            where: {
                id: { in: requestIds },
                status: { not: "PAID" } // Double check they are unpaid
            },
            select: {
                id: true,
                title: true,
                amount: true,
                dueDate: true
            }
        });

        if (invoices.length === 0) {
            return { success: false, error: "No unpaid invoices found for these IDs" };
        }

        const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://stroen-sons.com"}/dashboard`;

        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: member.email,
            subject: `Betalingspåminnelse: ${invoices.length} ubetalte fakturaer`,
            react: PaymentReminderEmail({
                memberName: member.firstName || "Medlem",
                invoices: invoices.map(inv => ({
                    ...inv,
                    dueDate: inv.dueDate ? inv.dueDate.toISOString() : null
                })),
                paymentUrl
            }),
        });

        if (error) throw error;

        return { success: true };

    } catch (error) {
        console.error("Failed to send payment reminder:", error);
        return { success: false, error: "Failed to send email" };
    }
}

/**
 * Send reminders to ALL members who have ANY unpaid invoices (status != PAID and != WAIVED presumably).
 * Usually 'PENDING' is the status for unpaid.
 */
export async function sendBulkPaymentReminders() {
    try {
        // 1. Find all members with PENDING payment requests
        const membersWithUnpaid = await db.member.findMany({
            where: {
                status: "ACTIVE",
                paymentRequests: {
                    some: {
                        status: "PENDING" // Only care about PENDING
                    }
                }
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                paymentRequests: {
                    where: { status: "PENDING" },
                    select: {
                        id: true,
                        title: true,
                        amount: true,
                        dueDate: true
                    }
                }
            }
        });

        let sentCount = 0;

        // Loop and send individual emails (cannot use batch 'to' array because content differs)
        // Resend batch endpoint accepts array of email objects. Let's try to use that if possible or just loop.
        // For simplicity and to avoid hitting complexity limits, we'll loop for now. 
        // If list is huge (1000+), we should use a queue. For < 100 members, loop is fine.

        const emailObjects = membersWithUnpaid.map((member: any) => {
            const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://stroen-sons.com"}/dashboard`;
            return {
                from: FROM_EMAIL,
                to: member.email,
                subject: `Betalingspåminnelse: ${member.paymentRequests.length} ubetalte fakturaer`,
                react: PaymentReminderEmail({
                    memberName: member.firstName || "Medlem",
                    invoices: member.paymentRequests.map((inv: any) => ({
                        ...inv,
                        dueDate: inv.dueDate ? inv.dueDate.toISOString() : null
                    })),
                    paymentUrl
                })
            };
        });

        // Batch in groups of 100 (Resend limit)
        const batchSize = 100;
        for (let i = 0; i < emailObjects.length; i += batchSize) {
            const batch = emailObjects.slice(i, i + batchSize);
            const { error } = await resend.batch.send(batch);

            if (error) {
                console.error("Batch send error:", error);
            } else {
                sentCount += batch.length;
            }
        }

        return { success: true, count: sentCount };

    } catch (error) {
        console.error("Failed to send bulk reminders:", error);
        return { success: false, error: "Failed to send bulk emails" };
    }
}
// ... existing code ...

interface SendEventNotificationParams {
    eventTitle: string;
    eventDescription: string;
    eventDate: string;
    eventLocation?: string;
    eventId: string;
}

import { NewEventEmail } from "@/components/emails/new-event-email";
import { UpdatedEventEmail } from "@/components/emails/updated-event-email";

export async function sendEventNotification({
    eventTitle,
    eventDescription,
    eventDate,
    eventLocation,
    eventId
}: SendEventNotificationParams) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("Missing RESEND_API_KEY, skipping email notification");
        return { success: false, error: "Missing API Key" };
    }

    try {
        const members = await db.member.findMany({
            where: {
                status: "ACTIVE",
                email: { not: undefined }
            },
            select: { email: true }
        });

        if (members.length === 0) {
            return { success: true, count: 0 };
        }

        const emailList = members.map(m => m.email);
        const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://stroen-sons.com"}/events/${eventId}`;

        // Clean content for email preview
        const cleanDescription = eventDescription
            ? eventDescription.replace(/[#*`_]/g, '').split('\n')[0]
            : "Ingen beskrivelse";

        const chunkSize = 50;
        const chunks = [];

        for (let i = 0; i < emailList.length; i += chunkSize) {
            chunks.push(emailList.slice(i, i + chunkSize));
        }

        for (const chunk of chunks) {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: [FROM_EMAIL], // Send to self, bcc everyone else
                bcc: chunk,
                subject: `Nytt arrangement: ${eventTitle}`,
                text: cleanDescription, // Fallback text
                react: NewEventEmail({
                    eventTitle,
                    eventDescription: cleanDescription,
                    eventDate,
                    eventLocation,
                    eventUrl,
                })
            });
        }

        return { success: true, count: emailList.length };
    } catch (error) {
        console.error("Failed to send event notification email:", error);
        return { success: false, error };
    }
}

export async function sendEventUpdateNotification({
    eventTitle,
    eventDescription,
    eventDate,
    eventLocation,
    eventId
}: SendEventNotificationParams) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("Missing RESEND_API_KEY, skipping email notification");
        return { success: false, error: "Missing API Key" };
    }

    try {
        const members = await db.member.findMany({
            where: {
                status: "ACTIVE",
                email: { not: undefined }
            },
            select: { email: true }
        });

        if (members.length === 0) {
            return { success: true, count: 0 };
        }

        const emailList = members.map(m => m.email);
        const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://stroen-sons.com"}/events/${eventId}`;

        const cleanDescription = eventDescription
            ? eventDescription.replace(/[#*`_]/g, '').split('\n')[0]
            : "Ingen beskrivelse";

        const chunkSize = 50;
        const chunks = [];

        for (let i = 0; i < emailList.length; i += chunkSize) {
            chunks.push(emailList.slice(i, i + chunkSize));
        }

        for (const chunk of chunks) {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: [FROM_EMAIL],
                bcc: chunk,
                subject: `Oppdatert arrangement: ${eventTitle}`,
                text: cleanDescription,
                react: UpdatedEventEmail({
                    eventTitle,
                    eventDescription: cleanDescription,
                    eventDate,
                    eventLocation,
                    eventUrl,
                })
            });
        }

        return { success: true, count: emailList.length };
    } catch (error) {
        console.error("Failed to send event update notification email:", error);
        return { success: false, error };
    }
}
