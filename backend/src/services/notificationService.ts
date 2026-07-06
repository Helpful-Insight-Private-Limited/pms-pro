import { prisma } from "../prisma/client.js";
import type { Prisma } from "../generated/prisma/index.js";
import { notificationRepository } from "../repositories/notificationRepository.js";
import { emitToUser } from "../realtime/socket.js";
import { ApiError } from "../utils/apiError.js";
import { emailService } from "./emailService.js";
import type { AuthUser } from "../types/auth.js";

type NotificationType =
  | "SYSTEM"
  | "PROJECT_ASSIGNED"
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "TASK_COMMENT"
  | "TASK_BLOCKED"
  | "MILESTONE_DUE"
  | "SPRINT_UPDATED"
  | "DAILY_REPORT"
  | "CHAT_MESSAGE";

type NotificationChannel = "IN_APP" | "EMAIL";

type TemplateInput = {
  key: string;
  type: NotificationType;
  channel: NotificationChannel;
  subjectTemplate?: string | null;
  bodyTemplate: string;
  isActive?: boolean;
};

type DomainNotificationInput = {
  templateKey?: string;
  type: NotificationType;
  userIds: string[];
  title?: string;
  message?: string;
  entityType?: string | null;
  entityId?: string | null;
  variables: Record<string, string | number | boolean | null>;
  metadata?: Prisma.InputJsonValue;
  sendEmail: boolean;
};

function renderTemplate(template: string | null | undefined, variables: Record<string, string | number | boolean | null>) {
  if (!template) return "";
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => String(variables[key] ?? ""));
}

async function isChannelEnabled(userId: string, type: NotificationType, channel: NotificationChannel) {
  const preference = await prisma.notificationPreference.findUnique({
    where: {
      userId_type_channel: {
        userId,
        type,
        channel
      }
    }
  });

  return preference?.isEnabled ?? true;
}

export const notificationService = {
  async listMyNotifications(user: AuthUser, status?: "UNREAD" | "READ" | "ARCHIVED") {
    const [items, unreadCount] = await Promise.all([
      notificationRepository.listUserNotifications(user.id, status),
      notificationRepository.unreadCount(user.id)
    ]);

    return { items, unreadCount };
  },

  async markRead(notificationId: string, user: AuthUser) {
    const notification = await prisma.userNotification.findFirst({
      where: { id: notificationId, userId: user.id, deletedAt: null }
    });

    if (!notification) throw new ApiError(404, "NOTIFICATION_NOT_FOUND", "Notification not found");

    return prisma.userNotification.update({
      where: { id: notificationId },
      data: {
        status: "READ",
        readAt: notification.readAt ?? new Date()
      }
    });
  },

  markAllRead(user: AuthUser) {
    return prisma.userNotification.updateMany({
      where: { userId: user.id, status: "UNREAD", deletedAt: null },
      data: { status: "READ", readAt: new Date() }
    });
  },

  listPreferences(user: AuthUser) {
    return notificationRepository.listPreferences(user.id);
  },

  async updatePreferences(input: { preferences: Array<{ type: NotificationType; channel: NotificationChannel; isEnabled: boolean }> }, user: AuthUser) {
    const preferences = [];

    for (const preference of input.preferences) {
      preferences.push(await prisma.notificationPreference.upsert({
        where: {
          userId_type_channel: {
            userId: user.id,
            type: preference.type,
            channel: preference.channel
          }
        },
        update: { isEnabled: preference.isEnabled },
        create: {
          userId: user.id,
          type: preference.type,
          channel: preference.channel,
          isEnabled: preference.isEnabled
        }
      }));
    }

    return preferences;
  },

  listTemplates() {
    return notificationRepository.listTemplates();
  },

  async createTemplate(input: TemplateInput, user: AuthUser) {
    return prisma.notificationTemplate.create({
      data: {
        ...input,
        isActive: input.isActive ?? true,
        createdBy: user.id
      }
    });
  },

  async updateTemplate(templateId: string, input: Partial<TemplateInput>, user: AuthUser) {
    return prisma.notificationTemplate.update({
      where: { id: templateId },
      data: {
        ...input,
        updatedBy: user.id
      }
    });
  },

  async createFromDomainEvent(input: DomainNotificationInput) {
    const template = input.templateKey ? await notificationRepository.findTemplateByKey(input.templateKey) : null;
    const type = template?.type ?? input.type;
    const title = input.title ?? (renderTemplate(template?.subjectTemplate, input.variables) || type.replaceAll("_", " "));
    const message = input.message ?? renderTemplate(template?.bodyTemplate, input.variables);

    if (!message) {
      throw new ApiError(400, "NOTIFICATION_MESSAGE_REQUIRED", "A message or template body is required");
    }

    const users = await prisma.user.findMany({
      where: { id: { in: [...new Set(input.userIds)] }, deletedAt: null, isActive: true },
      select: { id: true, email: true }
    });

    const notifications = [];

    for (const user of users) {
      if (await isChannelEnabled(user.id, type, "IN_APP")) {
        const notification = await prisma.userNotification.create({
          data: {
            userId: user.id,
            templateId: template?.id,
            type,
            title,
            message,
            entityType: input.entityType,
            entityId: input.entityId,
            metadata: input.metadata
          }
        });
        notifications.push(notification);
        emitToUser(user.id, "notification.created", notification);
      }

      if (input.sendEmail && await isChannelEnabled(user.id, type, "EMAIL")) {
        await emailService.queueAndSend({
          userId: user.id,
          templateId: template?.id,
          toEmail: user.email,
          subject: title,
          body: message
        });
      }
    }

    return notifications;
  },

  listEmailLogs() {
    return notificationRepository.listEmailLogs();
  }
};
