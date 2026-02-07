"use server";

import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";
import { Prisma, RequestStatus } from "@prisma/client";

export async function getMyEvents() {
    const { userId } = await auth();
    if (!userId) {
        return { success: false, error: "Ikke autentisert" };
    }

    try {
        const member = await db.member.findUnique({
            where: { clerkId: userId },
            include: {
                eventsAttending: {
                    orderBy: { startAt: "asc" },
                    include: {
                        paymentRequests: {
                            where: { member: { clerkId: userId } }
                        }
                    }
                },
                paymentRequests: {
                    where: { eventId: { not: null } }
                }
            }
        }) as Prisma.MemberGetPayload<{
            include: {
                eventsAttending: {
                    include: {
                        paymentRequests: true
                    }
                },
                paymentRequests: true
            }
        }> | null;

        if (!member) {
            return { success: false, error: "Fant ikke medlem" };
        }

        // We need to map events to their payment status for this user
        // Since PaymentRequest is linked to Event, we can find it in member.paymentRequests

        const now = new Date();
        const currentYear = now.getFullYear();

        const eventsWithStatus = member.eventsAttending.map(event => {
            // Find payment request for this event
            const paymentRequest = member.paymentRequests.find(pr => pr.eventId === event.id);

            let status: 'CONFIRMED' | 'PENDING_PAYMENT' | 'FREE' | 'WAITLIST' = 'CONFIRMED';

            // Logic for status
            if (event.totalCost && event.totalCost > 0) {
                if (paymentRequest) {
                    if (paymentRequest.status === RequestStatus.PAID) {
                        status = 'CONFIRMED';
                    } else {
                        status = 'PENDING_PAYMENT';
                    }
                } else {
                    status = 'PENDING_PAYMENT';
                }
            } else {
                status = 'FREE';
            }

            // If request status is PAID, overrides everything
            if (paymentRequest && paymentRequest.status === RequestStatus.PAID) {
                status = 'CONFIRMED';
            }

            return {
                id: event.id,
                title: event.title,
                location: event.location,
                startAt: event.startAt,
                role: (member.id === event.createdById ? 'HOST' : 'GUEST') as 'HOST' | 'GUEST',
                status,
                paymentRequestId: paymentRequest?.id,
                isPast: event.startAt < now,
                cost: event.totalCost
            };
        });

        // Stats
        const upcoming = eventsWithStatus.filter(e => !e.isPast);
        const unpaidCount = eventsWithStatus.filter(e => e.status === 'PENDING_PAYMENT').length;
        const totalThisYear = eventsWithStatus.filter(e => e.startAt.getFullYear() === currentYear && e.isPast).length;

        // Sort: Upcoming first (nearest date), then Past (descending date)
        const sortedEvents = [
            ...upcoming,
            ...eventsWithStatus.filter(e => e.isPast).sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
        ];

        return {
            success: true,
            data: {
                events: sortedEvents,
                stats: {
                    upcomingCount: upcoming.length,
                    nextEvent: upcoming[0] || null, unpaidCount,
                    totalThisYear
                }
            }
        };

    } catch (error) {
        console.error("Failed to fetch my events:", error);
        return { success: false, error: "Kunne ikke hente arrangementer" };
    }
}
