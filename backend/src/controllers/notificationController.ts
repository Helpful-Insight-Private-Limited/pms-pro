import type { Request, Response } from "express";
import { notificationService } from "../services/notificationService.js";
import { pushNotificationService } from "../services/pushNotificationService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function readParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string") throw new ApiError(400, "INVALID_ROUTE_PARAM", `Route parameter '${name}' is required`);
  return value;
}

function readStatus(value: unknown) {
  if (!value) return undefined;
  if (value === "UNREAD" || value === "READ" || value === "ARCHIVED") return value;
  throw new ApiError(400, "INVALID_NOTIFICATION_STATUS", "Invalid notification status");
}

export const notificationController = {
  listMine: asyncHandler(async (req: Request, res: Response) => {
    const data = await notificationService.listMyNotifications(req.user!, readStatus(req.query.status));
    res.json({ success: true, data });
  }),

  pushPublicKey: asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        isConfigured: pushNotificationService.isConfigured(),
        publicKey: pushNotificationService.publicKey()
      }
    });
  }),

  subscribePush: asyncHandler(async (req: Request, res: Response) => {
    const data = await pushNotificationService.subscribe(req.body, req.user!, req.get("user-agent"));
    res.status(201).json({ success: true, data });
  }),

  unsubscribePush: asyncHandler(async (req: Request, res: Response) => {
    const data = await pushNotificationService.unsubscribe(req.body.endpoint, req.user!);
    res.json({ success: true, data });
  }),

  markRead: asyncHandler(async (req: Request, res: Response) => {
    const data = await notificationService.markRead(readParam(req.params.id, "id"), req.user!);
    res.json({ success: true, data });
  }),

  markAllRead: asyncHandler(async (req: Request, res: Response) => {
    const data = await notificationService.markAllRead(req.user!);
    res.json({ success: true, data });
  }),

  listPreferences: asyncHandler(async (req: Request, res: Response) => {
    const data = await notificationService.listPreferences(req.user!);
    res.json({ success: true, data });
  }),

  updatePreferences: asyncHandler(async (req: Request, res: Response) => {
    const data = await notificationService.updatePreferences(req.body, req.user!);
    res.json({ success: true, data });
  }),

  listTemplates: asyncHandler(async (_req: Request, res: Response) => {
    const data = await notificationService.listTemplates();
    res.json({ success: true, data });
  }),

  createTemplate: asyncHandler(async (req: Request, res: Response) => {
    const data = await notificationService.createTemplate(req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  updateTemplate: asyncHandler(async (req: Request, res: Response) => {
    const data = await notificationService.updateTemplate(readParam(req.params.id, "id"), req.body, req.user!);
    res.json({ success: true, data });
  }),

  createDomainNotification: asyncHandler(async (req: Request, res: Response) => {
    const data = await notificationService.createFromDomainEvent(req.body);
    res.status(201).json({ success: true, data });
  }),

  listEmailLogs: asyncHandler(async (_req: Request, res: Response) => {
    const data = await notificationService.listEmailLogs();
    res.json({ success: true, data });
  })
};
