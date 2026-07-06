import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { prisma } from "../prisma/client.js";
import { authRepository } from "../repositories/authRepository.js";
import type { AuthUser } from "../types/auth.js";
import { verifyAccessToken } from "../utils/jwt.js";

type ClientToServerEvents = {
  "presence.request": () => void;
};

type ServerToClientEvents = {
  "notification.created": (payload: unknown) => void;
  "chat.message": (payload: unknown) => void;
  "chat.thread.created": (payload: unknown) => void;
  "presence.snapshot": (payload: unknown) => void;
  "presence.changed": (payload: unknown) => void;
};

let io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;
const onlineUsers = new Map<string, number>();

async function authenticateSocket(token?: string): Promise<AuthUser | null> {
  if (!token) return null;

  try {
    const authUser = await verifyAccessToken(token);
    const user = await authRepository.findUserById(authUser.id);

    if (!user || user.deletedAt || !user.isActive || user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
      return null;
    }

    return authUser;
  } catch {
    return null;
  }
}

async function joinChatThreads(socketId: string, userId: string) {
  if (!io) return;

  const participants = await prisma.chatParticipant.findMany({
    where: {
      userId,
      leftAt: null,
      thread: {
        deletedAt: null,
        isActive: true
      }
    },
    select: { threadId: true }
  });

  for (const participant of participants) {
    io.sockets.sockets.get(socketId)?.join(`thread:${participant.threadId}`);
  }
}

export function createRealtimeServer(server: HttpServer) {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: env.corsAllowedOrigins,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    const token = typeof socket.handshake.auth.token === "string" ? socket.handshake.auth.token : undefined;
    const user = await authenticateSocket(token);

    if (!user) {
      next(new Error("Authentication is required"));
      return;
    }

    socket.data.user = user;
    next();
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user as AuthUser;
    const currentCount = onlineUsers.get(user.id) ?? 0;
    onlineUsers.set(user.id, currentCount + 1);
    socket.join(`user:${user.id}`);
    await joinChatThreads(socket.id, user.id);
    socket.emit("presence.snapshot", { onlineUserIds: [...onlineUsers.keys()] });
    socket.on("presence.request", () => {
      socket.emit("presence.snapshot", { onlineUserIds: [...onlineUsers.keys()] });
    });

    if (currentCount === 0) {
      io?.emit("presence.changed", { userId: user.id, status: "ONLINE" });
    }

    socket.on("disconnect", () => {
      const nextCount = (onlineUsers.get(user.id) ?? 1) - 1;
      if (nextCount > 0) {
        onlineUsers.set(user.id, nextCount);
        return;
      }

      onlineUsers.delete(user.id);
      io?.emit("presence.changed", { userId: user.id, status: "OFFLINE" });
    });
  });

  return io;
}

export function emitToUser(userId: string, event: keyof ServerToClientEvents, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToThread(threadId: string, event: keyof ServerToClientEvents, payload: unknown) {
  io?.to(`thread:${threadId}`).emit(event, payload);
}

export function joinUserToThread(userId: string, threadId: string) {
  io?.in(`user:${userId}`).socketsJoin(`thread:${threadId}`);
}
