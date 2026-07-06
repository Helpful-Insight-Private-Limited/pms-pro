import { z } from "zod";

export const createDirectThreadSchema = z.object({
  participantId: z.string().min(1)
});

export const createGroupThreadSchema = z.object({
  name: z.string().trim().min(2).max(191),
  participantIds: z.array(z.string().min(1)).min(2)
});

export const sendChatMessageSchema = z.object({
  body: z.string().trim().min(1).max(5000)
});
