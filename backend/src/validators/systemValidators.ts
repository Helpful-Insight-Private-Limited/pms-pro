import { z } from "zod";

const optionalUrl = z.string().trim().url().max(500).nullable().optional();
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const color = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #111827");

export const updateSiteSettingsSchema = z.object({
  appName: z.string().trim().min(1).max(150).optional(),
  tagline: optionalText(255),
  logoUrl: optionalUrl,
  faviconUrl: optionalUrl,
  metaTitle: z.string().trim().min(1).max(150).optional(),
  metaDescription: optionalText(300),
  metaKeywords: optionalText(500),
  companyName: optionalText(150),
  supportEmail: z.string().trim().email().max(191).nullable().optional(),
  primaryColor: color.optional(),
  accentColor: color.optional()
});

export const cleanSystemSchema = z.object({
  confirmation: z.literal("CLEAN SYSTEM")
});

