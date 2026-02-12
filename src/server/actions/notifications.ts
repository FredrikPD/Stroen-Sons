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

type CreateNotificationsForMembersInput = Omit<CreateNotificationInput, "memberId"> & {
    memberIds: string[];
};

type CreateManyNotificationsInput = CreateNotificationInput[];

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

export async function createManyNotifications(notifications: CreateManyNotificationsInput) {
    try {
        if (notifications.length === 0) {
            return { created: 0, pushed: 0, removed: 0 };
        }

        const normalized = notifications
            .filter((item) => Boolean(item.memberId))
            .map((item) => ({
                memberId: item.memberId,
                type: item.type,
                title: item.title,
                message: item.message,
                link: item.link,
            }));

        if (normalized.length === 0) {
            return { created: 0, pushed: 0, removed: 0 };
        }

        await db.notification.createMany({
            data: normalized,
        });

        const uniqueMemberIds = Array.from(new Set(normalized.map((item) => item.memberId)));
        const pushResult = await sendPushSignalToMembers(uniqueMemberIds);

        return {
            created: normalized.length,
            pushed: pushResult.pushed,
            removed: pushResult.removed,
        };
    } catch (error) {
        console.error("Failed to create many notifications:", error);
        return { created: 0, pushed: 0, removed: 0 };
    }
}

export async function createNotificationsForMembers(data: CreateNotificationsForMembersInput) {
    try {
        const uniqueMemberIds = Array.from(new Set(data.memberIds.filter(Boolean)));
        if (uniqueMemberIds.length === 0) {
            return { created: 0, pushed: 0, removed: 0 };
        }

        await db.notification.createMany({
            data: uniqueMemberIds.map((memberId) => ({
                memberId,
                type: data.type,
                title: data.title,
                message: data.message,
                link: data.link,
            })),
        });

        const pushResult = await sendPushSignalToMembers(uniqueMemberIds);
        return {
            created: uniqueMemberIds.length,
            pushed: pushResult.pushed,
            removed: pushResult.removed,
        };
    } catch (error) {
        console.error("Failed to create notifications for members:", error);
        return { created: 0, pushed: 0, removed: 0 };
    }
}

export async function broadcastNotification(data: Omit<CreateNotificationInput, "memberId">) {
    try {
        const allMembers = await db.member.findMany({ select: { id: true } });
        await createNotificationsForMembers({
            ...data,
            memberIds: allMembers.map((member) => member.id),
        });

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

        const dueSoonPayloads = dueSoon.map((request) => ({
            memberId: request.memberId,
            type: NotificationType.INVOICE_CREATED,
            title: "Faktura forfaller snart",
            message: `"${request.title}" forfaller ${dueSoonDateLabel}.`,
            link: `/invoices/${request.id}`,
        }));

        const dueTodayPayloads = dueToday.map((request) => ({
            memberId: request.memberId,
            type: NotificationType.INVOICE_CREATED,
            title: "Faktura forfaller i dag",
            message: `"${request.title}" forfaller ${dueTodayDateLabel}.`,
            link: `/invoices/${request.id}`,
        }));

        const candidateNotifications = [...dueSoonPayloads, ...dueTodayPayloads];

        if (candidateNotifications.length > 0) {
            const relevantMemberIds = Array.from(new Set(candidateNotifications.map((item) => item.memberId)));
            const relevantLinks = candidateNotifications.map((item) => item.link).filter((link): link is string => Boolean(link));

            const existingToday = await db.notification.findMany({
                where: {
                    memberId: { in: relevantMemberIds },
                    type: NotificationType.INVOICE_CREATED,
                    title: { in: ["Faktura forfaller snart", "Faktura forfaller i dag"] },
                    link: { in: relevantLinks },
                    createdAt: { gte: startOfToday },
                },
                select: { memberId: true, title: true, link: true },
            });

            const existingKeys = new Set(
                existingToday.map((item) => `${item.memberId}::${item.title}::${item.link || ""}`)
            );

            const toCreate = candidateNotifications.filter((item) => {
                const key = `${item.memberId}::${item.title}::${item.link || ""}`;
                return !existingKeys.has(key);
            });

            await createManyNotifications(toCreate);
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
