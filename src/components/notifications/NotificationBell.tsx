"use client";

import { useState, useEffect, useRef } from "react";
import { getNotifications, markAsRead, markAllAsRead } from "@/server/actions/notifications";
import { Notification, NotificationType } from "@prisma/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications();
            setNotifications(data.notifications);
            setUnreadCount(data.unreadCount);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and polling
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000); // Poll every 1 minute
        return () => clearInterval(interval);
    }, []);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.read) {
            await markAsRead(notification.id);
            setUnreadCount((prev) => Math.max(0, prev - 1));
            setNotifications((prev) =>
                prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
            );
        }

        if (notification.link) {
            setIsOpen(false);
            // router.push(notification.link); // Handled by Link wrapper
        }
    };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case "EVENT_CREATED": return "calendar_add_on";
            case "EVENT_UPDATED": return "edit_calendar";
            case "POST_CREATED": return "article";
            case "POST_UPDATED": return "edit_note";
            case "INVOICE_CREATED": return "payments";
            case "BALANCE_WITHDRAWAL": return "account_balance_wallet";
            case "PHOTOS_UPLOADED": return "add_a_photo";
            default: return "notifications";
        }
    };

    const getDescription = (type: NotificationType, title: string) => {
        // We can use the message from DB, or format slightly if needed.
        // For now just use title/message
        return title;
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative text-gray-500 hover:text-[#4F46E5] transition-colors flex items-center p-1 rounded-full hover:bg-gray-100"
            >
                <span className={`material-symbols-outlined text-[1.5rem] ${isOpen ? 'text-[#4F46E5]' : ''}`}>
                    notifications
                </span>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 ring-1 ring-black/5 z-50 overflow-hidden transform origin-top-right transition-all">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 text-sm">Varsler</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs font-semibold text-[#4F46E5] hover:text-[#4338ca] transition-colors"
                            >
                                Merk alt som lest
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {loading ? (
                            <div className="p-8 text-center text-gray-400">
                                <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-[#4F46E5] rounded-full mx-auto mb-2"></div>
                                Laster...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                                <span className="material-symbols-outlined text-3xl text-gray-300">notifications_off</span>
                                <p className="text-sm">Ingen varsler</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notification) => {
                                    const NotificationWrapper = notification.link ? Link : "div";
                                    return (
                                        <NotificationWrapper
                                            key={notification.id}
                                            href={notification.link || ""}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`p-4 flex gap-4 cursor-pointer hover:bg-gray-50 transition-colors block text-left w-full ${!notification.read ? "bg-[#4F46E5]/5" : ""
                                                }`}
                                        >
                                            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${!notification.read ? "bg-[#4F46E5]/10 text-[#4F46E5]" : "bg-gray-100 text-gray-500"
                                                }`}>
                                                <span className="material-symbols-outlined text-xl">
                                                    {getIcon(notification.type)}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm ${!notification.read ? "font-semibold text-gray-900" : "font-medium text-gray-700"} truncate`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: nb })}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <div className="w-2 h-2 rounded-full bg-[#4F46E5] mt-2 shrink-0" />
                                            )}
                                        </NotificationWrapper>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-2 border-t border-gray-100 bg-gray-50/50 text-center">
                        {/* Footer if needed */}
                    </div>
                </div>
            )}
        </div>
    );
}
