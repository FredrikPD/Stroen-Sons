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
                    // Paid event but no request yet? Treat as pending or confirmed depending on business logic. 
                    // Assuming if no request, maybe it's paid on arrival or invoice not sent.
                    // For safety, if cost > 0, maybe check if user is host?
                    // Let's default to 'FREE' or 'CONFIRMED' if no request found, or maybe 'PENDING' if we want to be strict.
                    // The user image shows "Venter betaling" and "Gratis" and "Bekreftet".
                    // If we assume manual invoice generation, maybe missing request means 'CONFIRMED' (or 'REGISTERED').
                    // Let's use 'PENDING_PAYMENT' if cost > 0 and no paid request? No, better key off request existence.
                    status = 'PENDING_PAYMENT'; // "Venter betaling" generic fallback for paid events
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
                    nextEvent: upcoming[0] || null, // First one since we sorted asc in query (wait, query sort applies to list, but we reconstructed. filter keeps order? yes key order is asc from db)
                    unpaidCount,
                    totalThisYear
                }
            }
        };

    } catch (error) {
        console.error("Failed to fetch my events:", error);
        return { success: false, error: "Kunne ikke hente arrangementer" };
    }
}
