import webPush, { type PushSubscription as WebPushSubscription } from "web-push";
import { prisma } from "../prisma/client.js";
import { env } from "../config/env.js";
import type { AuthUser } from "../types/auth.js";

type PushSubscriptionInput = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type PushPayload = {
  id: string;
  title: string;
  body: string;
  type: string;
  url?: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: unknown;
};

const pushEnabled = Boolean(env.vapidPublicKey && env.vapidPrivateKey);

if (pushEnabled) {
  webPush.setVapidDetails(env.vapidSubject, env.vapidPublicKey!, env.vapidPrivateKey!);
}

function toWebPushSubscription(subscription: { endpoint: string; p256dh: string; auth: string }): WebPushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };
}

function notificationUrl(payload: PushPayload) {
  const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata as Record<string, unknown> : {};

  if (payload.type === "CHAT_MESSAGE" && typeof metadata.threadId === "string") {
    return `/dashboard?chatThreadId=${encodeURIComponent(metadata.threadId)}`;
  }

  if (payload.entityType === "TASK" && payload.entityId) return "/work";
  if (payload.entityType === "PROJECT" && payload.entityId) return "/projects";

  return "/dashboard";
}

async function deactivateSubscription(endpoint: string) {
  await prisma.pushSubscription.updateMany({
    where: { endpoint },
    data: {
      isActive: false,
      deletedAt: new Date()
    }
  });
}

export const pushNotificationService = {
  isConfigured() {
    return pushEnabled;
  },

  publicKey() {
    return env.vapidPublicKey ?? null;
  },

  async subscribe(input: PushSubscriptionInput, user: AuthUser, userAgent?: string) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      update: {
        userId: user.id,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent,
        isActive: true,
        deletedAt: null,
        lastUsedAt: new Date()
      },
      create: {
        userId: user.id,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent,
        lastUsedAt: new Date()
      }
    });
  },

  async unsubscribe(endpoint: string, user: AuthUser) {
    return prisma.pushSubscription.updateMany({
      where: { endpoint, userId: user.id },
      data: {
        isActive: false,
        deletedAt: new Date()
      }
    });
  },

  async sendToUser(userId: string, payload: PushPayload) {
    if (!pushEnabled) return;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
        deletedAt: null
      },
      select: {
        endpoint: true,
        p256dh: true,
        auth: true
      }
    });

    if (subscriptions.length === 0) return;

    const body = JSON.stringify({
      ...payload,
      url: payload.url ?? notificationUrl(payload)
    });

    await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(toWebPushSubscription(subscription), body, {
          TTL: 60 * 60 * 24,
          urgency: payload.type === "CHAT_MESSAGE" ? "high" : "normal"
        });

        await prisma.pushSubscription.updateMany({
          where: { endpoint: subscription.endpoint },
          data: { lastUsedAt: new Date() }
        });
      } catch (error) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : undefined;

        if (statusCode === 404 || statusCode === 410) {
          await deactivateSubscription(subscription.endpoint);
          return;
        }

        console.error("Web Push delivery failed", {
          endpoint: subscription.endpoint,
          statusCode,
          error
        });
      }
    }));
  }
};
