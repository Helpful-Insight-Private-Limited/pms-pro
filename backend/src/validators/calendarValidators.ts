import { z } from "zod";

const nullableText = z.string().trim().max(1000).nullable().optional();

const calendarEventBaseSchema = z.object({
  title: z.string().trim().min(1).max(191),
  description: nullableText,
  type: z.enum(["PROJECT", "MILESTONE", "SPRINT", "TASK", "LEAVE", "HOLIDAY", "MEETING", "OTHER"]).default("OTHER"),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  allDay: z.boolean().optional(),
  projectId: z.string().trim().min(1).nullable().optional(),
  taskId: z.string().trim().min(1).nullable().optional()
});

export const calendarEventSchema = calendarEventBaseSchema.refine((value) => value.startAt <= value.endAt, {
  message: "Start date/time must be before or equal to end date/time",
  path: ["endAt"]
});

export const updateCalendarEventSchema = calendarEventBaseSchema.partial().extend({
  isActive: z.boolean().optional()
}).refine((value) => !value.startAt || !value.endAt || value.startAt <= value.endAt, {
    message: "Start date/time must be before or equal to end date/time",
    path: ["endAt"]
  });

const developerLeaveBaseSchema = z.object({
  developerId: z.string().trim().min(1).optional(),
  type: z.enum(["FULL_DAY", "HALF_DAY", "SICK", "CASUAL", "VACATION", "UNPAID"]).default("FULL_DAY"),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: nullableText,
  approvalNote: nullableText
});

export const developerLeaveSchema = developerLeaveBaseSchema.refine((value) => value.startDate <= value.endDate, {
  message: "Start date must be before or equal to end date",
  path: ["endDate"]
});

export const updateDeveloperLeaveSchema = developerLeaveBaseSchema.partial().extend({
  approvedBy: z.string().trim().min(1).nullable().optional(),
  approvedAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional()
}).refine((value) => !value.startDate || !value.endDate || value.startDate <= value.endDate, {
    message: "Start date must be before or equal to end date",
    path: ["endDate"]
  });

export const holidaySchema = z.object({
  name: z.string().trim().min(1).max(191),
  holidayDate: z.coerce.date(),
  region: z.string().trim().max(100).nullable().optional(),
  description: nullableText
});

export const updateHolidaySchema = holidaySchema.partial().extend({
  isActive: z.boolean().optional()
});
