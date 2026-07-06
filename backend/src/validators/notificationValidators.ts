import { z } from "zod";

const notificationTypeSchema = z.enum([
  "SYSTEM",
  "PROJECT_ASSIGNED",
  "TASK_ASSIGNED",
  "TASK_UPDATED",
  "TASK_COMMENT",
  "TASK_BLOCKED",
  "MILESTONE_DUE",
  "SPRINT_UPDATED",
  "DAILY_REPORT",
  "CHAT_MESSAGE"
]);

const notificationChannelSchema = z.enum(["IN_APP", "EMAIL"]);

export const createNotificationTemplateSchema = z.object({
  key: z.string().trim().min(1).max(150),
  type: notificationTypeSchema,
  channel: notificationChannelSchema,
  subjectTemplate: z.string().trim().max(255).nullable().optional(),
  bodyTemplate: z.string().trim().min(1),
  isActive: z.boolean().optional()
});

export const updateNotificationTemplateSchema = createNotificationTemplateSchema.partial();

export const updateNotificationPreferencesSchema = z.object({
  preferences: z.array(z.object({
    type: notificationTypeSchema,
    channel: notificationChannelSchema,
    isEnabled: z.boolean()
  })).min(1)
});

export const createDomainNotificationSchema = z.object({
  templateKey: z.string().trim().min(1).optional(),
  type: notificationTypeSchema.default("SYSTEM"),
  userIds: z.array(z.string().trim().min(1)).min(1),
  title: z.string().trim().min(1).max(255).optional(),
  message: z.string().trim().min(1).optional(),
  entityType: z.string().trim().max(100).nullable().optional(),
  entityId: z.string().trim().max(191).nullable().optional(),
  variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  metadata: z.record(z.string(), z.unknown()).optional(),
  sendEmail: z.boolean().default(false)
});
