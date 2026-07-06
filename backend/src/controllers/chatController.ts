import type { Request, Response } from "express";
import { chatService } from "../services/chatService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function readParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string") throw new ApiError(400, "INVALID_ROUTE_PARAM", `Route parameter '${name}' is required`);
  return value;
}

export const chatController = {
  listUsers: asyncHandler(async (req: Request, res: Response) => {
    const data = await chatService.listAvailableUsers(req.user!);
    res.json({ success: true, data });
  }),

  listThreads: asyncHandler(async (req: Request, res: Response) => {
    const data = await chatService.listThreads(req.user!);
    res.json({ success: true, data });
  }),

  createDirectThread: asyncHandler(async (req: Request, res: Response) => {
    const data = await chatService.createDirectThread(req.body.participantId, req.user!);
    res.status(201).json({ success: true, data });
  }),

  createGroupThread: asyncHandler(async (req: Request, res: Response) => {
    const data = await chatService.createGroupThread(req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  listMessages: asyncHandler(async (req: Request, res: Response) => {
    const data = await chatService.listMessages(readParam(req.params.threadId, "threadId"), req.user!);
    res.json({ success: true, data });
  }),

  sendMessage: asyncHandler(async (req: Request, res: Response) => {
    const data = await chatService.sendMessage(readParam(req.params.threadId, "threadId"), req.body, req.user!);
    res.status(201).json({ success: true, data });
  })
};
