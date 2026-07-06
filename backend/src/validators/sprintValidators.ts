import { z } from "zod";

export const createSprintSchema = z.object({
  name: z.string().trim().min(1).max(191),
  goal: z.string().trim().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "HOLD", "COMPLETED"]).default("PLANNING"),
  capacity: z.coerce.number().min(0).default(0),
  velocity: z.coerce.number().min(0).default(0),
  storyPoints: z.coerce.number().int().min(0).default(0),
  progressPercentage: z.coerce.number().min(0).max(100).default(0)
});

export const updateSprintSchema = createSprintSchema.partial();
