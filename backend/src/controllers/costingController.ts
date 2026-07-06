import type { Request, Response } from "express";
import { costingService } from "../services/costingService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function readParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string") throw new ApiError(400, "INVALID_ROUTE_PARAM", `Route parameter '${name}' is required`);
  return value;
}

export const costingController = {
  createTimeLog: asyncHandler(async (req: Request, res: Response) => {
    const data = await costingService.createTimeLog(
      readParam(req.params.projectId, "projectId"),
      readParam(req.params.taskId, "taskId"),
      req.body,
      req.user!
    );
    res.status(201).json({ success: true, data });
  }),

  startTaskTimer: asyncHandler(async (req: Request, res: Response) => {
    const data = await costingService.startTaskTimer(
      readParam(req.params.projectId, "projectId"),
      readParam(req.params.taskId, "taskId"),
      req.body,
      req.user!
    );
    res.status(201).json({ success: true, data });
  }),

  stopTaskTimer: asyncHandler(async (req: Request, res: Response) => {
    const data = await costingService.stopTaskTimer(
      readParam(req.params.projectId, "projectId"),
      readParam(req.params.taskId, "taskId"),
      req.body,
      req.user!
    );
    res.json({ success: true, data });
  }),

  getActiveTaskTimer: asyncHandler(async (req: Request, res: Response) => {
    const data = await costingService.getActiveTaskTimer(readParam(req.params.projectId, "projectId"), readParam(req.params.taskId, "taskId"), req.user!);
    res.json({ success: true, data });
  }),

  listProjectTimeLogs: asyncHandler(async (req: Request, res: Response) => {
    const data = await costingService.listProjectTimeLogs(readParam(req.params.projectId, "projectId"), req.user!);
    res.json({ success: true, data });
  }),

  listTaskTimeLogs: asyncHandler(async (req: Request, res: Response) => {
    const data = await costingService.listTaskTimeLogs(readParam(req.params.projectId, "projectId"), readParam(req.params.taskId, "taskId"), req.user!);
    res.json({ success: true, data });
  }),

  getProjectCosting: asyncHandler(async (req: Request, res: Response) => {
    const data = await costingService.getProjectCosting(readParam(req.params.projectId, "projectId"), req.user!);
    res.json({ success: true, data });
  })
};
