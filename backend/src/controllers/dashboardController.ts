import type { Request, Response } from "express";
import { dashboardService } from "../services/dashboardService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const dashboardController = {
  mine: asyncHandler(async (req: Request, res: Response) => {
    const data = await dashboardService.getMyDashboard(req.user!);
    res.json({ success: true, data });
  }),

  admin: asyncHandler(async (req: Request, res: Response) => {
    const data = await dashboardService.getAdminDashboard(req.user!);
    res.json({ success: true, data });
  }),

  projectManager: asyncHandler(async (req: Request, res: Response) => {
    const data = await dashboardService.getProjectManagerDashboard(req.user!);
    res.json({ success: true, data });
  }),

  teamLeader: asyncHandler(async (req: Request, res: Response) => {
    const data = await dashboardService.getTeamLeaderDashboard(req.user!);
    res.json({ success: true, data });
  }),

  teamMember: asyncHandler(async (req: Request, res: Response) => {
    const data = await dashboardService.getTeamMemberDashboard(req.user!);
    res.json({ success: true, data });
  })
};
