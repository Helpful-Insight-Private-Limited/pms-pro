import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(100),
  description: z.string().trim().optional()
});

export const updateRoleSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional()
});

export const assignRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().min(1)).min(1)
});
