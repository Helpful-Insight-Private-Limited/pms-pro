import { prisma } from "../prisma/client.js";

export const notificationRepository = {
  listUserNotifications(userId: string, status?: "UNREAD" | "READ" | "ARCHIVED") {
    return prisma.userNotification.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(status ? { status } : {})
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  },

  unreadCount(userId: string) {
    return prisma.userNotification.count({
      where: { userId, status: "UNREAD", deletedAt: null }
    });
  },

  findTemplateByKey(key: string) {
    return prisma.notificationTemplate.findFirst({
      where: { key, deletedAt: null, isActive: true }
    });
  },

  listTemplates() {
    return prisma.notificationTemplate.findMany({
      where: { deletedAt: null },
      orderBy: [{ type: "asc" }, { channel: "asc" }, { key: "asc" }]
    });
  },

  listPreferences(userId: string) {
    return prisma.notificationPreference.findMany({
      where: { userId },
      orderBy: [{ type: "asc" }, { channel: "asc" }]
    });
  },

  listEmailLogs() {
    return prisma.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        template: { select: { id: true, key: true, type: true, channel: true } }
      }
    });
  }
};
