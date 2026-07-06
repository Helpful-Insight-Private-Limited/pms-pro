import type { Prisma } from "../generated/prisma/index.js";
import { prisma } from "../prisma/client.js";
import { emitToThread, joinUserToThread } from "../realtime/socket.js";
import { notificationService } from "./notificationService.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true
} satisfies Prisma.UserSelect;

const threadInclude = {
  participants: {
    where: { leftAt: null },
    include: { user: { select: userSelect } },
    orderBy: { joinedAt: "asc" as const }
  },
  messages: {
    where: { deletedAt: null },
    include: { sender: { select: userSelect } },
    orderBy: { createdAt: "desc" as const },
    take: 1
  }
} satisfies Prisma.ChatThreadInclude;

function canManageGroups(user: AuthUser) {
  return user.roles.includes("admin") || user.permissions.includes("chat.group.manage");
}

function senderName(user: { firstName: string; lastName?: string | null; email: string }) {
  return `${user.firstName} ${user.lastName ?? ""}`.trim() || user.email;
}

function messagePreview(body: string) {
  return body.length > 140 ? `${body.slice(0, 137)}...` : body;
}

function assertCanChat(user: AuthUser) {
  if (user.roles.includes("admin") || user.permissions.includes("chat.view")) return;
  throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
}

function assertCanMessage(user: AuthUser) {
  if (user.roles.includes("admin") || user.permissions.includes("chat.message")) return;
  throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action");
}

async function assertParticipant(threadId: string, userId: string) {
  const participant = await prisma.chatParticipant.findFirst({
    where: {
      threadId,
      userId,
      leftAt: null,
      thread: { deletedAt: null, isActive: true }
    }
  });

  if (!participant) {
    throw new ApiError(404, "CHAT_THREAD_NOT_FOUND", "Chat thread not found");
  }
}

async function assertUsersActive(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds)];
  const count = await prisma.user.count({
    where: {
      id: { in: uniqueUserIds },
      deletedAt: null,
      isActive: true,
      status: { notIn: ["SUSPENDED", "DEACTIVATED"] }
    }
  });

  if (count !== uniqueUserIds.length) {
    throw new ApiError(400, "INVALID_CHAT_USERS", "One or more chat users are invalid");
  }
}

async function allowedUserIdsFor(user: AuthUser) {
  if (user.roles.includes("admin") || user.permissions.includes("user.view")) {
    const users = await prisma.user.findMany({
      where: { deletedAt: null, isActive: true, status: { notIn: ["SUSPENDED", "DEACTIVATED"] } },
      select: { id: true }
    });
    return new Set(users.map((item) => item.id));
  }

  const projectLinks = await prisma.project.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [
        { projectManagerId: user.id },
        { teamLeaderId: user.id },
        { members: { some: { userId: user.id, deletedAt: null, isActive: true, releasedDate: null } } }
      ]
    },
    select: {
      projectManagerId: true,
      teamLeaderId: true,
      members: {
        where: { deletedAt: null, isActive: true, releasedDate: null },
        select: { userId: true }
      }
    }
  });

  return new Set(projectLinks.flatMap((project) => [project.projectManagerId, project.teamLeaderId, ...project.members.map((member) => member.userId)]).filter(Boolean) as string[]);
}

async function serializeThread(threadId: string) {
  return prisma.chatThread.findFirstOrThrow({
    where: { id: threadId },
    include: threadInclude
  });
}

export const chatService = {
  async listAvailableUsers(user: AuthUser) {
    assertCanChat(user);
    const allowedIds = await allowedUserIdsFor(user);
    allowedIds.delete(user.id);

    if (allowedIds.size === 0) return [];

    return prisma.user.findMany({
      where: {
        id: { in: [...allowedIds] },
        deletedAt: null,
        isActive: true,
        status: { notIn: ["SUSPENDED", "DEACTIVATED"] }
      },
      select: userSelect,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
    });
  },

  async listThreads(user: AuthUser) {
    assertCanChat(user);
    return prisma.chatThread.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        participants: { some: { userId: user.id, leftAt: null } }
      },
      include: threadInclude,
      orderBy: { updatedAt: "desc" },
      take: 50
    });
  },

  async createDirectThread(participantId: string, user: AuthUser) {
    assertCanMessage(user);
    if (participantId === user.id) throw new ApiError(400, "INVALID_CHAT_USER", "Select another user to start chat");

    const allowedIds = await allowedUserIdsFor(user);
    if (!allowedIds.has(participantId)) throw new ApiError(403, "FORBIDDEN", "You do not have permission to chat with this user");
    await assertUsersActive([participantId]);

    const existingThreads = await prisma.chatThread.findMany({
      where: {
        type: "DIRECT",
        deletedAt: null,
        isActive: true,
        participants: {
          some: { userId: user.id, leftAt: null }
        }
      },
      include: { participants: { where: { leftAt: null }, select: { userId: true } } }
    });

    const existing = existingThreads.find((thread) => {
      const participantIds = thread.participants.map((participant) => participant.userId).sort();
      return participantIds.length === 2 && participantIds[0] === [participantId, user.id].sort()[0] && participantIds[1] === [participantId, user.id].sort()[1];
    });

    if (existing) return serializeThread(existing.id);

    const thread = await prisma.chatThread.create({
      data: {
        type: "DIRECT",
        createdBy: user.id,
        participants: {
          create: [
            { userId: user.id, role: "OWNER" },
            { userId: participantId, role: "MEMBER" }
          ]
        }
      }
    });

    joinUserToThread(user.id, thread.id);
    joinUserToThread(participantId, thread.id);
    const serialized = await serializeThread(thread.id);
    emitToThread(thread.id, "chat.thread.created", serialized);
    return serialized;
  },

  async createGroupThread(input: { name: string; participantIds: string[] }, user: AuthUser) {
    assertCanMessage(user);
    if (!canManageGroups(user)) throw new ApiError(403, "FORBIDDEN", "Only admin and project managers can create group chats");

    const participantIds = [...new Set([user.id, ...input.participantIds])];
    if (participantIds.length < 3) throw new ApiError(400, "GROUP_CHAT_REQUIRES_USERS", "Group chat requires at least two other users");
    await assertUsersActive(participantIds);

    const thread = await prisma.chatThread.create({
      data: {
        type: "GROUP",
        name: input.name,
        createdBy: user.id,
        participants: {
          create: participantIds.map((userId) => ({
            userId,
            role: userId === user.id ? "OWNER" : "MEMBER"
          }))
        }
      }
    });

    for (const participantId of participantIds) {
      joinUserToThread(participantId, thread.id);
    }

    const serialized = await serializeThread(thread.id);
    emitToThread(thread.id, "chat.thread.created", serialized);
    return serialized;
  },

  async listMessages(threadId: string, user: AuthUser) {
    assertCanChat(user);
    await assertParticipant(threadId, user.id);

    return prisma.chatMessage.findMany({
      where: { threadId, deletedAt: null },
      include: { sender: { select: userSelect } },
      orderBy: { createdAt: "asc" },
      take: 200
    });
  },

  async sendMessage(threadId: string, input: { body: string }, user: AuthUser) {
    assertCanMessage(user);
    await assertParticipant(threadId, user.id);

    const message = await prisma.chatMessage.create({
      data: {
        threadId,
        senderId: user.id,
        body: input.body.trim()
      },
      include: { sender: { select: userSelect } }
    });

    await prisma.chatThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() }
    });

    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        type: true,
        name: true,
        participants: {
          where: { leftAt: null },
          select: { userId: true }
        }
      }
    });
    const recipientIds = [...new Set(thread?.participants.map((participant) => participant.userId).filter((userId) => userId !== user.id) ?? [])];

    if (recipientIds.length > 0) {
      const name = senderName(message.sender);
      await notificationService.createFromDomainEvent({
        templateKey: "chat.message.in_app",
        type: "CHAT_MESSAGE",
        userIds: recipientIds,
        title: `New message from ${name}`,
        message: messagePreview(message.body),
        entityType: "ChatThread",
        entityId: threadId,
        variables: {
          senderName: name,
          messagePreview: messagePreview(message.body),
          threadName: thread?.type === "GROUP" ? thread.name ?? "Group chat" : name
        },
        metadata: {
          threadId,
          messageId: message.id,
          senderId: user.id,
          senderName: name
        },
        sendEmail: false
      });
    }

    emitToThread(threadId, "chat.message", message);
    return message;
  }
};
