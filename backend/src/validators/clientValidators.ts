import { z } from "zod";

const optionalText = z.string().trim().nullable().optional();
const optionalUrl = z.string().trim().url().max(500).nullable().optional();

export const createClientSchema = z.object({
  name: z.string().trim().min(1).max(191),
  code: z.string().trim().min(1).max(50).nullable().optional(),
  contactName: optionalText,
  contactEmail: z.string().trim().email().max(191).nullable().optional(),
  contactPhone: z.string().trim().max(30).nullable().optional(),
  companyWebsite: optionalUrl,
  billingAddress: optionalText,
  notes: optionalText
});

export const updateClientSchema = createClientSchema.partial().extend({
  isActive: z.boolean().optional()
});
