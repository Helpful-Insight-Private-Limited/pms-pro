import { z } from "zod";

export const createCurrencySchema = z.object({
  code: z.string().trim().min(2).max(10).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(100),
  symbol: z.string().trim().max(10).nullable().optional()
});

export const updateCurrencySchema = createCurrencySchema.partial().extend({
  isActive: z.boolean().optional()
});

export const createTechnologyStackSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().max(100).nullable().optional()
});

export const updateTechnologyStackSchema = createTechnologyStackSchema.partial().extend({
  isActive: z.boolean().optional()
});
