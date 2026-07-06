import type { Request, Response } from "express";
import { sprintService } from "../services/sprintService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function readParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_ROUTE_PARAM", `Route parameter '${name}' is required`);
  }

  return value;
}

function readContext(req: Request) {
  return {
    projectId: readParam(req.params.projectId, "projectId"),
    milestoneId: readParam(req.params.milestoneId, "milestoneId")
  };
}

export const sprintController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { projectId, milestoneId } = readContext(req);
    const data = await sprintService.listSprints(projectId, milestoneId, req.user!);
    res.json({ success: true, data });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { projectId, milestoneId } = readContext(req);
    const data = await sprintService.createSprint(projectId, milestoneId, req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const { projectId, milestoneId } = readContext(req);
    const data = await sprintService.getSprint(projectId, milestoneId, readParam(req.params.sprintId, "sprintId"), req.user!);
    res.json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const { projectId, milestoneId } = readContext(req);
    const data = await sprintService.updateSprint(projectId, milestoneId, readParam(req.params.sprintId, "sprintId"), req.body, req.user!);
    res.json({ success: true, data });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const { projectId, milestoneId } = readContext(req);
    const data = await sprintService.deleteSprint(projectId, milestoneId, readParam(req.params.sprintId, "sprintId"), req.user!);
    res.json({ success: true, data });
  }),

  health: asyncHandler(async (req: Request, res: Response) => {
    const { projectId, milestoneId } = readContext(req);
    const data = await sprintService.calculateSprintHealth(projectId, milestoneId, readParam(req.params.sprintId, "sprintId"), req.user!);
    res.json({ success: true, data });
  })
};
