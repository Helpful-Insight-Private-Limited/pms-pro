import { z } from "zod";

export const createProjectAttachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(150),
  fileSize: z.coerce.number().int().min(1).max(50 * 1024 * 1024),
  storagePath: z.string().trim().min(1).max(500),
  publicUrl: z.string().url().max(500).nullable().optional(),
  description: z.string().trim().nullable().optional()
});

export const updateProjectAttachmentSchema = createProjectAttachmentSchema.partial();

export const createProjectLinkSchema = z.object({
  title: z.string().trim().min(1).max(191),
  url: z.string().url().max(500),
  type: z.enum(["GIT", "STAGING", "PRODUCTION", "API_DOCS", "DESIGN", "DOCUMENTATION", "OTHER"]).default("OTHER"),
  description: z.string().trim().nullable().optional()
});

export const updateProjectLinkSchema = createProjectLinkSchema.partial();

export const createProjectCredentialSchema = z.object({
  title: z.string().trim().min(1).max(191),
  type: z.enum(["SERVER", "STAGING", "PRODUCTION", "API", "DATABASE", "GIT", "OTHER"]).default("OTHER"),
  username: z.string().trim().max(191).nullable().optional(),
  secret: z.string().min(1).max(10000),
  host: z.string().trim().max(255).nullable().optional(),
  port: z.coerce.number().int().min(1).max(65535).nullable().optional(),
  notes: z.string().trim().nullable().optional()
});

export const updateProjectCredentialSchema = createProjectCredentialSchema
  .partial()
  .extend({
    secret: z.string().min(1).max(10000).optional()
  });
