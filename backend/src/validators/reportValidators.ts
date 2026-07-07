import { z } from "zod";

const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "REVIEW", "TESTING", "COMPLETED", "BLOCKED", "HOLD"]);

export const createTaskUpdateSchema = z.object({
  currentStatus: taskStatusSchema,
  progressPercentage: z.coerce.number().min(0).max(100),
  workDoneToday: z.string().trim().min(1),
  planForTomorrow: z.string().trim().nullable().optional(),
  blockers: z.string().trim().nullable().optional(),
  timeSpent: z.coerce.number().min(0).optional(),
  updateDate: z.coerce.date().optional()
});

export const sendProjectReportEmailSchema = z.object({
  projectId: z.string().trim().min(1),
  toEmail: z.string().trim().email().max(191).optional(),
  subject: z.string().trim().min(1).max(255).optional(),
  message: z.string().trim().max(1000).optional()
});
