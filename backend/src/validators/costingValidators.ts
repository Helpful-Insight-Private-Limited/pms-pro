import { z } from "zod";

export const createTaskTimeLogSchema = z.object({
  developerId: z.string().trim().min(1).optional(),
  workDate: z.coerce.date().optional(),
  hoursWorked: z.coerce.number().min(0.01).max(24),
  description: z.string().trim().nullable().optional()
});

export const taskTimerSchema = z.object({
  description: z.string().trim().nullable().optional()
});
