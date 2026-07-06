"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Plus, Send, Smile, Users, X } from "lucide-react";
import { api, readSessionUser, type ChatMessage, type ChatThread, type ChatUser, type Id } from "@/lib/api";
import { getRealtimeSocket } from "@/lib/realtime";
import { cn } from "@/lib/utils";

function displayName(user?: Pick<ChatUser, "firstName" | "lastName" | "email"> | null) {
  if (!user) return "Unknown user";
  return `${user.firstName} ${user.lastName ?? ""}`.trim() || user.email;
}

function threadName(thread: ChatThread, currentUserId?: Id) {
  if (thread.type === "GROUP") return thread.name || "Group chat";
  const other = thread.participants.find((participant) => participant.userId !== currentUserId)?.user;
  return displayName(other);
}

function initials(user?: Pick<ChatUser, "firstName" | "lastName" | "email"> | null) {
  const name = displayName(user);
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function messageDateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function messageDateLabel(value: string) {
  const date = new Date(value);
  const today = startOfLocalDay(new Date());
  const messageDay = startOfLocalDay(date);
  const diffDays = Math.round((today.getTime() - messageDay.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(date);
}

const emojiGroups = [
  {
    label: "Smileys",
    items: ["😀", "😃", "😄", "😁", "😊", "🙂", "😉", "😍", "🤩", "😎", "🥳", "😂", "🤣", "😅", "😇", "🤔", "😐", "😮", "😢", "😡"]
  },
  {
    label: "Work",
    items: ["👍", "👎", "👏", "🙌", "🙏", "🤝", "✅", "☑️", "❌", "⚠️", "❓", "💬", "📌", "📎", "📝", "📅", "⏰", "🚀", "🎯", "🔥"]
  },
  {
    label: "Objects",
    items: ["💡", "⭐", "🏆", "📈", "📊", "💻", "🧑‍💻", "🔍", "🔒", "🔔", "📣", "📁", "📄", "🧪", "🛠️", "🌐", "📱", "☕", "🍕", "🎉"]
  }
];

const emojis = ["👍", "✅", "😊", "🙏", "🔥", "🎯", "🚀", "👀", "💬", "⚠️", "❓", "👏"];

export function ChatDrawer({
  open,
  initialThreadId,
  unreadThreadCounts,
  onThreadRead,
  onClose
}: {
  open: boolean;
  initialThreadId?: Id | null;
  unreadThreadCounts?: Record<Id, number>;
  onThreadRead?: (threadId: Id) => void | Promise<void>;
  onClose: () => void;
}) {
  const currentUser = readSessionUser();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupUserIds, setGroupUserIds] = useState<Id[]>([]);
  const [groupOpen, setGroupOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<Id>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canCreateGroup = Boolean(currentUser?.roles.includes("admin") || currentUser?.permissions.includes("chat.group.manage"));

  const selectedThreadId = selectedThread?.id;

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setLoading(true);
    setError("");

    Promise.all([api.chat.users(), api.chat.threads()])
      .then(([nextUsers, nextThreads]) => {
        if (!mounted) return;
        setUsers(nextUsers);
        setThreads(nextThreads);
        setSelectedThread((current) => {
          if (initialThreadId) return nextThreads.find((thread) => thread.id === initialThreadId) ?? current ?? nextThreads[0] ?? null;
          return current ?? nextThreads[0] ?? null;
        });
      })
      .catch((err: Error) => mounted && setError(err.message))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [initialThreadId, open]);

  useEffect(() => {
    if (!open || !initialThreadId) return;
    const thread = threads.find((item) => item.id === initialThreadId);
    if (thread) setSelectedThread(thread);
  }, [initialThreadId, open, threads]);

  useEffect(() => {
    if (!open || !selectedThreadId) {
      setMessages([]);
      return;
    }

    let mounted = true;
    api.chat.messages(selectedThreadId)
      .then((items) => {
        if (!mounted) return;
        setMessages(items);
        void onThreadRead?.(selectedThreadId);
      })
      .catch((err: Error) => mounted && setError(err.message));

    return () => {
      mounted = false;
    };
  }, [onThreadRead, open, selectedThreadId]);

  useEffect(() => {
    if (!open || !selectedThreadId) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open, selectedThreadId]);

  useEffect(() => {
    if (!open) return;
    const socket = getRealtimeSocket();
    if (!socket) return;

    function onMessage(message: ChatMessage) {
      setThreads((items) => items.map((thread) => thread.id === message.threadId ? { ...thread, messages: [message], updatedAt: message.createdAt } : thread));
      if (message.threadId === selectedThreadId) {
        setMessages((items) => items.some((item) => item.id === message.id) ? items : [...items, message]);
        void onThreadRead?.(message.threadId);
      }
    }

    function onThread(thread: ChatThread) {
      setThreads((items) => items.some((item) => item.id === thread.id) ? items : [thread, ...items]);
    }

    function onPresenceSnapshot(payload: { onlineUserIds?: Id[] }) {
      setOnlineUserIds(new Set(payload.onlineUserIds ?? []));
    }

    function onPresenceChanged(payload: { userId?: Id; status?: "ONLINE" | "OFFLINE" }) {
      if (!payload.userId) return;
      setOnlineUserIds((current) => {
        const next = new Set(current);
        if (payload.status === "ONLINE") next.add(payload.userId!);
        if (payload.status === "OFFLINE") next.delete(payload.userId!);
        return next;
      });
    }

    socket.on("chat.message", onMessage);
    socket.on("chat.thread.created", onThread);
    socket.on("presence.snapshot", onPresenceSnapshot);
    socket.on("presence.changed", onPresenceChanged);
    socket.emit("presence.request");

    return () => {
      socket.off("chat.message", onMessage);
      socket.off("chat.thread.created", onThread);
      socket.off("presence.snapshot", onPresenceSnapshot);
      socket.off("presence.changed", onPresenceChanged);
    };
  }, [onThreadRead, open, selectedThreadId]);

  const usersWithoutThreads = useMemo(() => {
    const directUserIds = new Set(
      threads
        .filter((thread) => thread.type === "DIRECT")
        .flatMap((thread) => thread.participants.filter((participant) => participant.userId !== currentUser?.id).map((participant) => participant.userId))
    );
    return users.filter((user) => !directUserIds.has(user.id));
  }, [currentUser?.id, threads, users]);

  async function startDirectChat(userId: Id) {
    setError("");
    const thread = await api.chat.createDirect(userId);
    setThreads((items) => items.some((item) => item.id === thread.id) ? items : [thread, ...items]);
    setSelectedThread(thread);
    void onThreadRead?.(thread.id);
  }

  async function createGroup(event: FormEvent) {
    event.preventDefault();
    setError("");
    const thread = await api.chat.createGroup({ name: groupName, participantIds: groupUserIds });
    setThreads((items) => items.some((item) => item.id === thread.id) ? items : [thread, ...items]);
    setSelectedThread(thread);
    void onThreadRead?.(thread.id);
    setGroupName("");
    setGroupUserIds([]);
    setGroupOpen(false);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selectedThread || !draft.trim()) return;

    const body = draft.trim();
    setDraft("");
    setError("");

    try {
      await api.chat.sendMessage(selectedThread.id, { body });
    } catch (err) {
      setDraft(body);
      setError(err instanceof Error ? err.message : "Message could not be sent");
    }
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    void sendMessage(event as unknown as FormEvent);
  }

  function insertEmoji(emoji: string) {
    const input = textareaRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    const nextDraft = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
    setDraft(nextDraft);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  function selectThread(thread: ChatThread) {
    setSelectedThread(thread);
    void onThreadRead?.(thread.id);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/45 backdrop-blur-sm">
      <aside className="ml-auto flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl md:w-[880px]">
        <header className="flex h-16 items-center justify-between border-b border-[#d7dde8] px-5">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-[#111827]">
              <MessageCircle className="h-4 w-4 text-[#2563eb]" />
              Team Chat
            </div>
            <div className="text-xs text-[#667085]">Realtime direct and group conversations</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md border border-[#d7dde8] text-[#667085] hover:bg-[#f4f7fb]" aria-label="Close chat">
            <X className="h-4 w-4" />
          </button>
        </header>

        {error ? <div className="border-b border-[#fecaca] bg-[#fff1f2] px-5 py-2 text-sm font-medium text-[#b42318]">{error}</div> : null}

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[310px_1fr]">
          <section className="min-h-0 border-r border-[#d7dde8] bg-[#f8fafc]">
            <div className="border-b border-[#d7dde8] p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase text-[#667085]">Conversations</div>
                {canCreateGroup ? (
                  <button type="button" onClick={() => setGroupOpen((value) => !value)} className="inline-flex h-8 items-center gap-1 rounded-md bg-[#f4c430] px-2 text-xs font-semibold text-[#111827]">
                    <Plus className="h-3.5 w-3.5" />
                    Group
                  </button>
                ) : null}
              </div>

              {groupOpen ? (
                <form onSubmit={createGroup} className="mt-3 space-y-2 rounded-md border border-[#d7dde8] bg-white p-3">
                  <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group name" className="h-9 w-full rounded-md border border-[#c8d3e1] px-3 text-sm outline-none focus:border-[#2563eb]" />
                  <div className="max-h-28 space-y-1 overflow-auto">
                    {users.map((user) => (
                      <label key={user.id} className="flex items-center gap-2 text-xs text-[#344054]">
                        <input
                          type="checkbox"
                          checked={groupUserIds.includes(user.id)}
                          onChange={(event) => setGroupUserIds((items) => event.target.checked ? [...items, user.id] : items.filter((id) => id !== user.id))}
                        />
                        {displayName(user)}
                      </label>
                    ))}
                  </div>
                  <button type="submit" className="h-8 w-full rounded-md bg-[#2563eb] text-xs font-semibold text-white">Create Group</button>
                </form>
              ) : null}
            </div>

            <div className="max-h-44 overflow-auto border-b border-[#d7dde8] p-3">
              <div className="mb-2 text-xs font-semibold uppercase text-[#667085]">Start Direct Chat</div>
              {usersWithoutThreads.length === 0 ? <div className="text-xs text-[#667085]">{loading ? "Loading users..." : "No new users available."}</div> : null}
              <div className="space-y-1">
                {usersWithoutThreads.map((user) => (
                  <button key={user.id} type="button" onClick={() => startDirectChat(user.id)} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-white">
                    <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#111827] text-xs font-bold text-[#f4c430]">
                      {initials(user)}
                      <PresenceDot online={onlineUserIds.has(user.id)} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-[#111827]">{displayName(user)}</span>
                      <span className="block truncate text-xs text-[#667085]">{onlineUserIds.has(user.id) ? "Online" : "Offline"} - {user.email}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 overflow-auto p-3">
              <div className="space-y-1">
                {threads.map((thread) => {
                  const lastMessage = thread.messages?.[0]?.body;
                  const unreadCount = unreadThreadCounts?.[thread.id] ?? 0;
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => selectThread(thread)}
                      className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-white", selectedThread?.id === thread.id && "bg-white shadow-sm")}
                    >
                      <span className={cn("relative grid h-10 w-10 shrink-0 place-items-center rounded-md text-xs font-bold", thread.type === "GROUP" ? "bg-[#2563eb] text-white" : "bg-[#111827] text-[#f4c430]")}>
                        {thread.type === "GROUP" ? <Users className="h-4 w-4" /> : initials(thread.participants.find((participant) => participant.userId !== currentUser?.id)?.user)}
                        {thread.type === "DIRECT" ? <PresenceDot online={onlineUserIds.has(thread.participants.find((participant) => participant.userId !== currentUser?.id)?.userId ?? "")} /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-[#111827]">{threadName(thread, currentUser?.id)}</span>
                          {unreadCount > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#2563eb] px-1.5 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
                        </span>
                        <span className="block truncate text-xs text-[#667085]">{lastMessage || `${thread.participants.length} participant${thread.participants.length === 1 ? "" : "s"}`}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="flex min-h-0 flex-col">
            {selectedThread ? (
              <>
                <div className="border-b border-[#d7dde8] px-5 py-4">
                  <div className="text-sm font-semibold text-[#111827]">{threadName(selectedThread, currentUser?.id)}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#667085]">
                    {selectedThread.participants.map((participant) => (
                      <span key={participant.userId} className="inline-flex items-center gap-1 rounded-md border border-[#d7dde8] bg-white px-2 py-1">
                        <span className={cn("h-2 w-2 rounded-full", onlineUserIds.has(participant.userId) ? "bg-[#16a34a]" : "bg-[#98a2b3]")} />
                        {displayName(participant.user)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-auto bg-[#f8fafc] p-5">
                  {messages.length === 0 ? <div className="rounded-md border border-dashed border-[#c8d3e1] bg-white p-6 text-center text-sm text-[#667085]">No messages yet.</div> : null}
                  {messages.map((message, index) => {
                    const mine = message.senderId === currentUser?.id;
                    const currentDateKey = messageDateKey(message.createdAt);
                    const previousDateKey = index > 0 ? messageDateKey(messages[index - 1].createdAt) : null;
                    const showDateDivider = currentDateKey !== previousDateKey;
                    return (
                      <div key={message.id} className="space-y-3">
                        {showDateDivider ? <DateDivider label={messageDateLabel(message.createdAt)} /> : null}
                        <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[75%] rounded-md px-3 py-2 shadow-sm", mine ? "bg-[#2563eb] text-white" : "bg-white text-[#111827]")}>
                            {!mine ? <div className="mb-1 text-xs font-semibold text-[#2563eb]">{displayName(message.sender)}</div> : null}
                            <div className="whitespace-pre-wrap text-sm">{message.body}</div>
                            <div className={cn("mt-1 text-[11px]", mine ? "text-white/75" : "text-[#667085]")}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={sendMessage} className="relative flex items-end gap-2 border-t border-[#d7dde8] p-4">
                  <div className="relative">
                    <button type="button" onClick={() => setEmojiOpen((value) => !value)} className="grid h-11 w-11 place-items-center rounded-md border border-[#d7dde8] bg-white text-[#111827]" aria-label="Add emoji">
                      <Smile className="h-4 w-4" />
                    </button>
                    {emojiOpen ? (
                      <div className="absolute bottom-12 left-0 w-72 rounded-md border border-[#d7dde8] bg-white p-3 shadow-xl">
                        <div className="max-h-64 space-y-3 overflow-auto pr-1">
                          {emojiGroups.map((group) => (
                            <div key={group.label}>
                              <div className="mb-1 text-[11px] font-semibold uppercase text-[#667085]">{group.label}</div>
                              <div className="grid grid-cols-8 gap-1">
                                {group.items.map((emoji, index) => (
                                  <button key={`${group.label}-${emoji}-${index}`} type="button" onClick={() => insertEmoji(emoji)} className="grid h-8 w-8 place-items-center rounded-md text-lg hover:bg-[#f4f7fb]">
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleDraftKeyDown}
                    rows={2}
                    placeholder="Write a message"
                    className="min-h-11 flex-1 rounded-md border border-[#c8d3e1] px-3 py-2 text-sm outline-none focus:border-[#2563eb]"
                  />
                  <button type="submit" className="grid h-11 w-11 place-items-center rounded-md bg-[#2563eb] text-white" aria-label="Send message">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div>
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-[#f4c430] text-[#111827]">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-[#111827]">Select or start a conversation</div>
                  <div className="mt-1 text-sm text-[#667085]">Your project conversations will appear here.</div>
                </div>
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-[#d7dde8]" />
      <div className="rounded-full border border-[#d7dde8] bg-white px-3 py-1 text-xs font-semibold text-[#667085] shadow-sm">{label}</div>
      <div className="h-px flex-1 bg-[#d7dde8]" />
    </div>
  );
}

function PresenceDot({ online }: { online: boolean }) {
  return <span className={cn("absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white", online ? "bg-[#16a34a]" : "bg-[#98a2b3]")} />;
}
