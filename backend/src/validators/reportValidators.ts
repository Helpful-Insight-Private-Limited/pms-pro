import { z } from "zod";

export const createTaskUpdateSchema = z.object({
  currentStatus: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "TESTING", "COMPLETED", "BLOCKED", "HOLD"]),
  progressPercentage: z.coerce.number().min(0).max(100),
  workDoneToday: z.string().trim().min(1),
  planForTomorrow: z.string().trim().nullable().optional(),
  blockers: z.string().trim().nullable().optional(),
  timeSpent: z.coerce.number().min(0).default(0),
  updateDate: z.coerce.date().optional()
});

export const reportDateQuerySchema = z.object({
  reportDate: z.coerce.date().optional()
});
