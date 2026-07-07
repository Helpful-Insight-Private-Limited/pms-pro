import type { Request, Response } from "express";
import { systemService } from "../services/systemService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const systemController = {
  siteSettings: asyncHandler(async (_req: Request, res: Response) => {
    const data = await systemService.getSiteSettings();
    res.json({ success: true, data });
  }),

  updateSiteSettings: asyncHandler(async (req: Request, res: Response) => {
    const data = await systemService.updateSiteSettings(req.body, req.user!);
    res.json({ success: true, data });
  }),

  cleanDemoData: asyncHandler(async (req: Request, res: Response) => {
    const data = await systemService.cleanDemoData(req.user!);
    res.json({ success: true, data });
  })
};

