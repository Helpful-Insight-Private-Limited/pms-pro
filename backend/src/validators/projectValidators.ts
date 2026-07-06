import { z } from "zod";

const optionalUrl = z.string().url().max(500).nullable().optional();
const dateField = z.coerce.date().nullable().optional();

export const projectMemberSchema = z.object({
  userId: z.string().min(1),
  roleInProject: z
    .enum(["PROJECT_MANAGER", "TEAM_LEADER", "DEVELOPER", "REVIEWER", "QA", "DESIGNER", "OBSERVER"])
    .default("DEVELOPER"),
  allocationPercentage: z.coerce.number().min(0).max(100).default(100),
  assignedDate: z.coerce.date().optional(),
  releasedDate: z.coerce.date().nullable().optional()
});

export const createProjectSchema = z.object({
  title: z.string().trim().min(1).max(191),
  code: z.string().trim().min(1).max(50),
  clientId: z.string().min(1),
  description: z.string().trim().nullable().optional(),
  budget: z.coerce.number().min(0).default(0),
  currency: z.string().trim().min(3).max(10).default("USD"),
  startDate: dateField,
  endDate: dateField,
  status: z.enum(["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED", "DELAYED"]).default("DRAFT"),
  technologyStack: z.array(z.string().trim().min(1)).default([]),
  projectManagerId: z.string().min(1),
  teamLeaderId: z.string().min(1).nullable().optional(),
  teamMemberIds: z.array(z.string().min(1)).default([]),
  gitRepositoryUrl: optionalUrl,
  stagingUrl: optionalUrl,
  productionUrl: optionalUrl,
  apiDocumentationUrl: optionalUrl,
  notes: z.string().trim().nullable().optional()
});

export const updateProjectSchema = createProjectSchema
  .omit({ code: true, teamMemberIds: true })
  .partial()
  .extend({
    code: z.string().trim().min(1).max(50).optional()
  });

export const assignProjectMembersSchema = z.object({
  members: z.array(projectMemberSchema).default([])
});
