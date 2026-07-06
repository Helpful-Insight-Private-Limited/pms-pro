import { z } from "zod";

export const createMilestoneSchema = z.object({
  title: z.string().trim().min(1).max(191),
  description: z.string().trim().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  responsibleUserId: z.string().min(1).nullable().optional(),
  status: z.enum(["PENDING", "ACTIVE", "HOLD", "COMPLETED", "DELAYED"]).default("PENDING"),
  progressPercentage: z.coerce.number().min(0).max(100).default(0),
  notes: z.string().trim().nullable().optional()
});

export const updateMilestoneSchema = createMilestoneSchema.partial();
