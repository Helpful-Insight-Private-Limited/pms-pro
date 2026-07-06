import { z } from "zod";

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).optional(),
  email: z.string().email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(10),
  phone: z.string().trim().max(30).optional(),
  roleIds: z.array(z.string().min(1)).min(1)
});

export const updateUserSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().max(100).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  avatarUrl: z.string().url().max(500).nullable().optional(),
  status: z.enum(["ACTIVE", "INVITED", "SUSPENDED", "DEACTIVATED"]).optional(),
  isActive: z.boolean().optional()
});

export const assignUserRolesSchema = z.object({
  roleIds: z.array(z.string().min(1)).min(1)
});
