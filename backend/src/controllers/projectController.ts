import type { Request, Response } from "express";
import { projectService } from "../services/projectService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function readParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_ROUTE_PARAM", `Route parameter '${name}' is required`);
  }

  return value;
}

export const projectController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectService.createProject(req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectService.listProjects(req.user!);
    res.json({ success: true, data });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectService.getProjectById(readParam(req.params.id, "id"), req.user!);
    res.json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectService.updateProject(readParam(req.params.id, "id"), req.body, req.user!);
    res.json({ success: true, data });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectService.softDeleteProject(readParam(req.params.id, "id"), req.user!);
    res.json({ success: true, data });
  }),

  assignMembers: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectService.assignMembers(readParam(req.params.id, "id"), req.body.members, req.user!);
    res.json({ success: true, data });
  })
};
