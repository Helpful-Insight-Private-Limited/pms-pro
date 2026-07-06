import { z } from "zod";

export const runJobSchema = z.object({
  jobName: z.enum([
    "daily-report-generation",
    "deadline-reminders",
    "overdue-task-detection",
    "delayed-milestone-detection",
    "budget-threshold-alerts",
    "daily-summary",
    "weekly-summary"
  ]).optional(),
  date: z.coerce.date().optional()
});
