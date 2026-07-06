import type { Request, Response } from "express";
import { milestoneService } from "../services/milestoneService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function readParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_ROUTE_PARAM", `Route parameter '${name}' is required`);
  }

  return value;
}

export const milestoneController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const data = await milestoneService.listMilestones(readParam(req.params.projectId, "projectId"), req.user!);
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await milestoneService.createMilestone(readParam(req.params.projectId, "projectId"), req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await milestoneService.getMilestone(
      readParam(req.params.projectId, "projectId"),
      readParam(req.params.milestoneId, "milestoneId"),
      req.user!
    );
    res.json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await milestoneService.updateMilestone(
      readParam(req.params.projectId, "projectId"),
      readParam(req.params.milestoneId, "milestoneId"),
      req.body,
      req.user!
    );
    res.json({ success: true, data });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const data = await milestoneService.deleteMilestone(
      readParam(req.params.projectId, "projectId"),
      readParam(req.params.milestoneId, "milestoneId"),
      req.user!
    );
    res.json({ success: true, data });
  }),

  markDelayed: asyncHandler(async (req: Request, res: Response) => {
    const data = await milestoneService.markDelayedMilestones(readParam(req.params.projectId, "projectId"), req.user!);
    res.json({ success: true, data });
  })
};
