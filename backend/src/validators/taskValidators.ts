import { z } from "zod";

const optionalDate = z.coerce.date().nullable().optional();

export const createTaskSchema = z.object({
  milestoneId: z.string().min(1).nullable().optional(),
  sprintId: z.string().min(1).nullable().optional(),
  parentTaskId: z.string().min(1).nullable().optional(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().nullable().optional(),
  assignedDeveloperId: z.string().min(1).nullable().optional(),
  reviewerId: z.string().min(1).nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "TESTING", "COMPLETED", "BLOCKED", "HOLD"]).default("TODO"),
  estimatedHours: z.coerce.number().min(0).default(0),
  actualHours: z.coerce.number().min(0).default(0),
  storyPoints: z.coerce.number().int().min(0).default(0),
  progressPercentage: z.coerce.number().min(0).max(100).default(0),
  startDate: optionalDate,
  dueDate: optionalDate,
  completedDate: optionalDate,
  labels: z.array(z.string().trim().min(1)).default([]),
  dependencyTaskIds: z.array(z.string().min(1)).default([])
});

export const updateTaskSchema = createTaskSchema.partial();

export const createTaskCommentSchema = z.object({
  comment: z.string().trim().min(1),
  mentions: z.array(z.string().min(1)).default([])
});

export const createTaskBlockerSchema = z.object({
  description: z.string().trim().min(1)
});

export const updateTaskBlockerSchema = z.object({
  isResolved: z.boolean()
});

export const createTaskAttachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(150),
  fileSize: z.coerce.number().int().min(1).max(50 * 1024 * 1024),
  storagePath: z.string().trim().min(1).max(500),
  publicUrl: z.string().url().max(500).nullable().optional()
});
