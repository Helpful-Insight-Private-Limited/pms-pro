"use client";

import Link from "next/link";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Bell, BriefcaseBusiness, CalendarDays, Check, ClipboardList, FolderKanban, LayoutDashboard, ListTodo, LogOut, Menu, MessageCircle, Search, Settings, UserCircle, Users } from "lucide-react";
import { ChatDrawer } from "@/components/chat-drawer";
import { api, clearSession, type Id } from "@/lib/api";
import { disconnectRealtimeSocket, getRealtimeSocket } from "@/lib/realtime";
import { enablePushNotifications, isPushSupported } from "@/lib/push-notifications";
import { useSessionUser } from "@/lib/session";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "report.view" },
  { href: "/activity-logs", label: "Activity", icon: ClipboardList, permission: "activityLog.view" },
  { href: "/clients", label: "Clients", icon: BriefcaseBusiness, permission: "client.view" },
  { href: "/projects", label: "Projects", icon: FolderKanban, permission: "project.view" },
  { href: "/work", label: "Work", icon: ListTodo, permission: "task.view" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, permission: "calendar.view" },
  { href: "/team", label: "Team", icon: Users, permission: "user.view" },
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/settings", label: "Settings", icon: Settings, permission: "role.view" }
];

type NotificationItem = {
  id: Id;
  title: string;
  message: string;
  type: string;
  status: "UNREAD" | "READ" | "ARCHIVED";
  createdAt: string;
  metadata?: {
    threadId?: Id;
    [key: string]: unknown;
  } | null;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSessionUser();
  const role = user?.roles?.[0]?.replace(/([a-z])([A-Z])/g, "$1 $2") ?? "Workspace user";
  const [chatOpen, setChatOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatThreadUnreadCounts, setChatThreadUnreadCounts] = useState<Record<Id, number>>({});
  const [initialChatThreadId, setInitialChatThreadId] = useState<Id | null>(null);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<NotificationPermission>("default");
  const [pushError, setPushError] = useState<string | null>(null);

  function chatUnreadByThread(items: NotificationItem[]) {
    return items.reduce<Record<Id, number>>((counts, item) => {
      const threadId = item.metadata?.threadId;
      if (item.status === "UNREAD" && item.type === "CHAT_MESSAGE" && threadId) {
        counts[threadId] = (counts[threadId] ?? 0) + 1;
      }
      return counts;
    }, {});
  }

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!user?.id || !(user.permissions.includes("notification.view") || user.roles.includes("admin"))) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted" || !isPushSupported()) return;

    enablePushNotifications().catch((error) => {
      setPushError(error instanceof Error ? error.message : "Push notifications could not be enabled.");
    });
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const threadId = searchParams.get("chatThreadId");
    if (!threadId || !(user?.permissions.includes("chat.view") || user?.roles.includes("admin"))) return;

    openChat(threadId);
    router.replace(pathname);
  }, [pathname, router, user?.id]);

  useEffect(() => {
    if (!user?.permissions.includes("notification.view") && !user?.roles.includes("admin")) return;

    api.notifications.listMine<{ items: NotificationItem[]; unreadCount: number }>()
      .then((data) => {
        setNotifications(data.items);
        setUnreadCount(data.unreadCount);
        setChatUnreadCount(data.items.filter((item) => item.status === "UNREAD" && item.type === "CHAT_MESSAGE").length);
        setChatThreadUnreadCounts(chatUnreadByThread(data.items));
      })
      .catch(() => undefined);
  }, [user?.id]);

  useEffect(() => {
    const socket = getRealtimeSocket();
    if (!socket) return;

    function onNotification(notification: NotificationItem) {
      setNotifications((items) => [notification, ...items.filter((item) => item.id !== notification.id)].slice(0, 100));
      setUnreadCount((count) => count + 1);
      if (notification.type === "CHAT_MESSAGE") {
        setChatUnreadCount((count) => count + 1);
        const threadId = notification.metadata?.threadId;
        if (threadId) {
          setChatThreadUnreadCounts((counts) => ({ ...counts, [threadId]: (counts[threadId] ?? 0) + 1 }));
        }
      }

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          tag: notification.id
        });
        browserNotification.onclick = () => {
          window.focus();
          if (notification.type === "CHAT_MESSAGE") {
            openChat(notification.metadata?.threadId ?? null);
          }
        };
      }
    }

    socket.on("notification.created", onNotification);
    return () => {
      socket.off("notification.created", onNotification);
    };
  }, [user?.id]);

  function logout() {
    clearSession();
    disconnectRealtimeSocket();
    router.push("/login");
  }

  async function markRead(id: Id) {
    const notification = notifications.find((item) => item.id === id);
    await api.notifications.markRead(id);
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, status: "READ" } : item));
    setUnreadCount((count) => Math.max(0, count - 1));
    if (notification?.type === "CHAT_MESSAGE") {
      setChatUnreadCount((count) => Math.max(0, count - 1));
    }
  }

  async function markAllRead() {
    await api.notifications.markAllRead();
    setNotifications((items) => items.map((item) => ({ ...item, status: "READ" })));
    setUnreadCount(0);
    setChatUnreadCount(0);
  }

  function openChat(threadId?: Id | null) {
    setInitialChatThreadId(threadId ?? null);
    setChatOpen(true);
  }

  async function enableBrowserNotifications() {
    setPushError(null);

    try {
      const permission = await enablePushNotifications();
      setBrowserNotificationPermission(permission);
    } catch (error) {
      setPushError(error instanceof Error ? error.message : "Push notifications could not be enabled.");
      if (typeof window !== "undefined" && "Notification" in window) {
        setBrowserNotificationPermission(Notification.permission);
      }
    }
  }

  async function handleNotificationClick(notification: NotificationItem) {
    if (notification.status === "UNREAD") {
      await markRead(notification.id);
    }

    if (notification.type === "CHAT_MESSAGE") {
      openChat(notification.metadata?.threadId ?? null);
      setNotificationsOpen(false);
    }
  }

  const clearChatThreadUnread = useCallback(async (threadId: Id) => {
    const unreadNotifications = notifications.filter((item) => item.status === "UNREAD" && item.type === "CHAT_MESSAGE" && item.metadata?.threadId === threadId);
    if (unreadNotifications.length === 0) return;

    setNotifications((items) => items.map((item) => unreadNotifications.some((notification) => notification.id === item.id) ? { ...item, status: "READ" } : item));
    setUnreadCount((count) => Math.max(0, count - unreadNotifications.length));
    setChatUnreadCount((count) => Math.max(0, count - unreadNotifications.length));
    setChatThreadUnreadCounts((counts) => {
      const next = { ...counts };
      delete next[threadId];
      return next;
    });

    await Promise.all(unreadNotifications.map((notification) => api.notifications.markRead(notification.id).catch(() => undefined)));
  }, [notifications]);

  return (
    <div className="min-h-screen bg-[#eef4ff] text-[#1f2937]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-[#d7dde8] bg-white text-[#111827] lg:block">
        <div className="flex h-20 items-center border-b border-[#edf1f7] px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-[#111827] text-lg font-black text-[#f4c430] shadow-sm">P</div>
            <div>
              <div className="text-xs font-semibold uppercase text-[#2563eb]">Project OS</div>
              <div className="text-lg font-semibold">PMS Workspace</div>
            </div>
          </div>
        </div>
        <div className="border-b border-[#edf1f7] p-4">
          <div className="rounded-md border border-[#d7dde8] bg-[#f8fafc] p-3">
            <div className="text-xs uppercase text-[#667085]">Signed in as</div>
            <div className="mt-1 truncate text-sm font-semibold">{user ? `${user.firstName} ${user.lastName ?? ""}`.trim() : "User"}</div>
            <div className="mt-2 inline-flex h-7 items-center rounded-md bg-[#f4c430] px-2 text-xs font-semibold capitalize text-[#111827]">{role}</div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.filter((item) => !item.permission || user?.permissions?.includes(item.permission)).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-[#536079] hover:bg-[#f4f7fb] hover:text-[#111827]",
                  active && "bg-[#111827] text-white shadow-sm hover:bg-[#111827] hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[#d7dde8] bg-white/90 px-4 shadow-sm backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8] bg-white lg:hidden" aria-label="Menu">
              <Menu className="h-4 w-4" />
            </button>
            <div className="hidden h-10 w-[340px] items-center gap-2 rounded-md border border-[#d7dde8] bg-white px-3 shadow-sm md:flex">
              <Search className="h-4 w-4 text-[#667085]" />
              <span className="text-sm text-[#667085]">Search projects, tasks, people</span>
            </div>
            <div className="md:hidden">
              <div className="text-sm font-semibold text-[#111827]">PMS</div>
              <div className="text-xs text-[#667085]">Workspace</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user?.permissions.includes("chat.view") || user?.roles.includes("admin") ? (
              <button
                type="button"
                onClick={() => openChat()}
                className="relative grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8] bg-white text-[#111827] hover:bg-[#f4f7fb]"
                aria-label="Open chat"
              >
                <MessageCircle className="h-4 w-4" />
                {chatUnreadCount > 0 ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#2563eb] px-1 text-[10px] font-bold text-white">{chatUnreadCount > 9 ? "9+" : chatUnreadCount}</span> : null}
              </button>
            ) : null}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((value) => !value)}
                className="relative grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8] bg-white text-[#111827] hover:bg-[#f4f7fb]"
                aria-label="Notifications"
              >
              <Bell className="h-4 w-4" />
                {unreadCount > 0 ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
              </button>
              {notificationsOpen ? (
                <div className="absolute right-0 mt-2 w-[360px] overflow-hidden rounded-md border border-[#d7dde8] bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-[#edf1f7] px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-[#111827]">Notifications</div>
                      <div className="text-xs text-[#667085]">{unreadCount} unread</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {browserNotificationPermission === "default" && isPushSupported() ? (
                        <button type="button" onClick={enableBrowserNotifications} className="inline-flex h-8 items-center rounded-md bg-[#2563eb] px-2 text-xs font-semibold text-white">
                          Enable
                        </button>
                      ) : null}
                      <button type="button" onClick={markAllRead} className="inline-flex h-8 items-center gap-1 rounded-md border border-[#d7dde8] px-2 text-xs font-semibold text-[#111827]">
                        <Check className="h-3.5 w-3.5" />
                        Read all
                      </button>
                    </div>
                  </div>
                  {pushError ? <div className="border-b border-[#fde68a] bg-[#fffbeb] px-4 py-2 text-xs text-[#92400e]">{pushError}</div> : null}
                  <div className="max-h-[420px] overflow-auto">
                    {notifications.length === 0 ? <div className="px-4 py-8 text-center text-sm text-[#667085]">No notifications yet.</div> : null}
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className={cn("block w-full border-b border-[#edf1f7] px-4 py-3 text-left hover:bg-[#f8fafc]", notification.status === "UNREAD" && "bg-[#eff6ff]")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[#111827]">{notification.title}</div>
                            <div className="mt-1 line-clamp-2 text-xs text-[#667085]">{notification.message}</div>
                          </div>
                          {notification.status === "UNREAD" ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#2563eb]" /> : null}
                        </div>
                        <div className="mt-2 text-[11px] uppercase text-[#98a2b3]">{notification.type.replaceAll("_", " ")}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#111827] px-3 text-sm font-semibold text-white"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </div>
      <ChatDrawer
        open={chatOpen}
        initialThreadId={initialChatThreadId}
        unreadThreadCounts={chatThreadUnreadCounts}
        onThreadRead={clearChatThreadUnread}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
}
