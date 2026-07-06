import type { Request, Response } from "express";
import { reportService } from "../services/reportService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function readParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string") throw new ApiError(400, "INVALID_ROUTE_PARAM", `Route parameter '${name}' is required`);
  return value;
}

function readOptionalDate(value: unknown) {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new ApiError(400, "INVALID_DATE", "Invalid reportDate");
  return date;
}

export const reportController = {
  createTaskUpdate: asyncHandler(async (req: Request, res: Response) => {
    const data = await reportService.createTaskUpdate(readParam(req.params.projectId, "projectId"), readParam(req.params.taskId, "taskId"), req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  listTaskUpdates: asyncHandler(async (req: Request, res: Response) => {
    const data = await reportService.listTaskUpdates(readParam(req.params.projectId, "projectId"), req.user!, readOptionalDate(req.query.reportDate));
    res.json({ success: true, data });
  }),

  generateDailyReports: asyncHandler(async (req: Request, res: Response) => {
    const data = await reportService.generateDailyReports(readParam(req.params.projectId, "projectId"), req.user!, readOptionalDate(req.query.reportDate));
    res.json({ success: true, data });
  }),

  listDailyReports: asyncHandler(async (req: Request, res: Response) => {
    const data = await reportService.listDailyReports(readParam(req.params.projectId, "projectId"), req.user!, readOptionalDate(req.query.reportDate));
    res.json({ success: true, data });
  }),

  getDailySummary: asyncHandler(async (req: Request, res: Response) => {
    const data = await reportService.getDailySummary(readParam(req.params.projectId, "projectId"), req.user!, readOptionalDate(req.query.reportDate));
    res.json({ success: true, data });
  })
};
