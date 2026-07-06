import type { Request, Response } from "express";
import { permissionService } from "../services/permissionService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const permissionController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await permissionService.listPermissions();
    res.json({ success: true, data });
  })
};
