import { prisma } from "../prisma/client.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";

type SiteSettingsInput = {
  appName?: string;
  tagline?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  metaTitle?: string;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  companyName?: string | null;
  supportEmail?: string | null;
  primaryColor?: string;
  accentColor?: string;
};

const defaultSiteSettings = {
  key: "default",
  appName: "PMS Workspace",
  tagline: "Project delivery, team operations, and reporting in one workspace.",
  metaTitle: "PMS",
  metaDescription: "Project Management System",
  primaryColor: "#111827",
  accentColor: "#f4c430"
};

function isAdmin(user: AuthUser) {
  return user.roles.includes("admin");
}

async function adminUserIds() {
  const admins = await prisma.user.findMany({
    where: {
      deletedAt: null,
      userRoles: {
        some: {
          isActive: true,
          revokedAt: null,
          role: { slug: "admin", deletedAt: null, isActive: true }
        }
      }
    },
    select: { id: true }
  });

  return admins.map((user) => user.id);
}

function addCount(summary: Record<string, number>, key: string, count: number) {
  summary[key] = (summary[key] ?? 0) + count;
}

export const systemService = {
  async getSiteSettings() {
    return prisma.siteSetting.upsert({
      where: { key: "default" },
      update: {},
      create: defaultSiteSettings
    });
  },

  async updateSiteSettings(input: SiteSettingsInput, user: AuthUser) {
    const settings = await prisma.siteSetting.upsert({
      where: { key: "default" },
      update: { ...input, updatedBy: user.id },
      create: { ...defaultSiteSettings, ...input, createdBy: user.id, updatedBy: user.id }
    });

    await prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: "system.siteSettingsUpdated",
        module: "system",
        entityType: "SiteSetting",
        entityId: settings.id,
        metadata: { changedFields: Object.keys(input) }
      }
    });

    return settings;
  },

  async cleanDemoData(user: AuthUser) {
    if (!isAdmin(user)) {
      throw new ApiError(403, "ADMIN_ONLY", "Only admins can clean system data");
    }

    const preservedAdminIds = await adminUserIds();
    if (!preservedAdminIds.includes(user.id)) preservedAdminIds.push(user.id);

    const summary: Record<string, number> = {};

    await prisma.$transaction(async (tx) => {
      addCount(summary, "taskDependencies", (await tx.taskDependency.deleteMany()).count);
      addCount(summary, "taskBlockers", (await tx.taskBlocker.deleteMany()).count);
      addCount(summary, "taskComments", (await tx.taskComment.deleteMany()).count);
      addCount(summary, "taskAttachments", (await tx.taskAttachment.deleteMany()).count);
      addCount(summary, "taskUpdates", (await tx.taskUpdate.deleteMany()).count);
      addCount(summary, "taskTimeLogs", (await tx.taskTimeLog.deleteMany()).count);
      addCount(summary, "taskTimers", (await tx.taskTimer.deleteMany()).count);
      addCount(summary, "dailyReports", (await tx.dailyReport.deleteMany()).count);
      addCount(summary, "tasks", (await tx.task.deleteMany()).count);
      addCount(summary, "sprints", (await tx.sprint.deleteMany()).count);
      addCount(summary, "milestones", (await tx.milestone.deleteMany()).count);

      addCount(summary, "projectCredentials", (await tx.projectCredential.deleteMany()).count);
      addCount(summary, "projectLinks", (await tx.projectLink.deleteMany()).count);
      addCount(summary, "projectAttachments", (await tx.projectAttachment.deleteMany()).count);
      addCount(summary, "projectMembers", (await tx.projectMember.deleteMany()).count);
      addCount(summary, "projects", (await tx.project.deleteMany()).count);
      addCount(summary, "clients", (await tx.client.deleteMany()).count);

      addCount(summary, "calendarEvents", (await tx.calendarEvent.deleteMany()).count);
      addCount(summary, "developerLeaves", (await tx.developerLeave.deleteMany()).count);
      addCount(summary, "holidays", (await tx.holiday.deleteMany()).count);

      addCount(summary, "chatMessages", (await tx.chatMessage.deleteMany()).count);
      addCount(summary, "chatParticipants", (await tx.chatParticipant.deleteMany()).count);
      addCount(summary, "chatThreads", (await tx.chatThread.deleteMany()).count);

      addCount(summary, "userNotifications", (await tx.userNotification.deleteMany()).count);
      addCount(summary, "notificationPreferences", (await tx.notificationPreference.deleteMany()).count);
      addCount(summary, "pushSubscriptions", (await tx.pushSubscription.deleteMany()).count);
      addCount(summary, "emailLogs", (await tx.emailLog.deleteMany()).count);
      addCount(summary, "refreshTokens", (await tx.refreshToken.deleteMany({ where: { userId: { notIn: preservedAdminIds } } })).count);
      addCount(summary, "backgroundJobRuns", (await tx.backgroundJobRun.deleteMany()).count);
      addCount(summary, "activityLogs", (await tx.activityLog.deleteMany()).count);

      addCount(summary, "developerRates", (await tx.developerRate.deleteMany()).count);
      addCount(summary, "developerProfiles", (await tx.developerProfile.deleteMany()).count);
      addCount(summary, "userRoleAssignersCleared", (await tx.userRole.updateMany({ where: { assignedBy: { notIn: preservedAdminIds } }, data: { assignedBy: null } })).count);
      addCount(summary, "userRoles", (await tx.userRole.deleteMany({ where: { userId: { notIn: preservedAdminIds } } })).count);
      addCount(summary, "users", (await tx.user.deleteMany({ where: { id: { notIn: preservedAdminIds } } })).count);

      await tx.activityLog.create({
        data: {
          actorId: user.id,
          action: "system.demoDataCleaned",
          module: "system",
          entityType: "System",
          entityId: "demo-data",
          metadata: { summary, preservedAdminIds }
        }
      });
    }, { timeout: 30000 });

    return {
      cleanedAt: new Date().toISOString(),
      preservedAdmins: preservedAdminIds.length,
      summary
    };
  }
};
