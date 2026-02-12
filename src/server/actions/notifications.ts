"use server";

import { db } from "@/server/db";
import { ensureMember } from "@/server/auth/ensureMember";
import { NotificationType } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { sendPushSignalToMember, sendPushSignalToMembers } from "@/server/push/web-push";

export async function getNotifications() {
    const member = await ensureMember();

    const notifications = await db.notification.findMany({
        where: { memberId: member.id },
        orderBy: { createdAt: "desc" },
        take: 20,
    });

    const unreadCount = await db.notification.count({
        where: { memberId: member.id, read: false },
    });

    return { notifications, unreadCount };
}

export async function markAsRead(notificationId: string) {
    const member = await ensureMember();

    await db.notification.update({
        where: { id: notificationId, memberId: member.id },
        data: { read: true },
    });

    revalidatePath("/", "layout");
}

export async function markAllAsRead() {
    const member = await ensureMember();

    await db.notification.updateMany({
        where: { memberId: member.id, read: false },
        data: { read: true },
    });

    revalidatePath("/", "layout");
}

type CreateNotificationInput = {
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    memberId: string;
};

// Internal helper - not exposed as a server action directly unless needed
export async function createNotification(data: CreateNotificationInput) {
    try {
        await db.notification.create({
            data: {
                type: data.type,
                title: data.title,
                message: data.message,
                link: data.link,
                memberId: data.memberId,
            },
        });

        await sendPushSignalToMember(data.memberId);
        // We can't revalidatePath for specific users easily in a shared action, 
        // but the next time they fetch it will be there.
    } catch (error) {
        console.error("Failed to create notification:", error);
        // Don't throw, notifications shouldn't block main actions
    }
}

export async function broadcastNotification(data: Omit<CreateNotificationInput, "memberId">) {
    try {
        const allMembers = await db.member.findMany({ select: { id: true } });

        // Create notifications in batches if necessary, but loop is fine for now
        await db.notification.createMany({
            data: allMembers.map(m => ({
                memberId: m.id,
                type: data.type,
                title: data.title,
                message: data.message,
                link: data.link,
            }))
        });

        await sendPushSignalToMembers(allMembers.map((member) => member.id));

    } catch (error) {
        console.error("Failed to broadcast notification:", error);
    }
}

export async function notifyNewPhotos(eventId: string) {
    try {
        const event = await db.event.findUnique({
            where: { id: eventId },
            select: { title: true }
        });

        if (!event) return;

        await broadcastNotification({
            type: "PHOTOS_UPLOADED",
            title: "Nye bilder",
            message: `Nye bilder er lagt til i albumet: ${event.title}`,
            link: `/gallery/${eventId}`,
        });
    } catch (error) {
        console.error("Failed to notify about new photos:", error);
    }
}

export async function sendInvoiceDeadlineReminders() {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const startInThreeDays = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3);
        const startInFourDays = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 4);

        const [dueSoon, dueToday] = await Promise.all([
            db.paymentRequest.findMany({
                where: {
                    status: "PENDING",
                    dueDate: {
                        gte: startInThreeDays,
                        lt: startInFourDays,
                    },
                    dueSoonReminderSentAt: null,
                },
                select: {
                    id: true,
                    memberId: true,
                    title: true,
                    dueDate: true,
                }
            }),
            db.paymentRequest.findMany({
                where: {
                    status: "PENDING",
                    dueDate: {
                        gte: startOfToday,
                        lt: startOfTomorrow,
                    },
                    dueTodayReminderSentAt: null,
                },
                select: {
                    id: true,
                    memberId: true,
                    title: true,
                    dueDate: true,
                }
            })
        ]);

        const dueSoonDateLabel = startInThreeDays.toLocaleDateString("nb-NO");
        const dueTodayDateLabel = startOfToday.toLocaleDateString("nb-NO");

        await Promise.all(dueSoon.map((request) =>
            createNotification({
                memberId: request.memberId,
                type: NotificationType.INVOICE_CREATED,
                title: "Faktura forfaller snart",
                message: `"${request.title}" forfaller ${dueSoonDateLabel}.`,
                link: `/invoices/${request.id}`,
            })
        ));

        await Promise.all(dueToday.map((request) =>
            createNotification({
                memberId: request.memberId,
                type: NotificationType.INVOICE_CREATED,
                title: "Faktura forfaller i dag",
                message: `"${request.title}" forfaller ${dueTodayDateLabel}.`,
                link: `/invoices/${request.id}`,
            })
        ));

        if (dueSoon.length > 0) {
            await db.paymentRequest.updateMany({
                where: { id: { in: dueSoon.map((request) => request.id) } },
                data: { dueSoonReminderSentAt: now },
            });
        }

        if (dueToday.length > 0) {
            await db.paymentRequest.updateMany({
                where: { id: { in: dueToday.map((request) => request.id) } },
                data: { dueTodayReminderSentAt: now },
            });
        }

        return {
            success: true,
            dueSoonCount: dueSoon.length,
            dueTodayCount: dueToday.length,
        };
    } catch (error) {
        console.error("Failed to send invoice deadline reminders:", error);
        return { success: false, dueSoonCount: 0, dueTodayCount: 0 };
    }
}
