import type { Request, Response } from "express";
import { advancedReportService } from "../services/advancedReportService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readDate(value: unknown, field: string) {
  const raw = readString(value);
  if (!raw) return undefined;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "INVALID_REPORT_FILTER", `${field} must be a valid date`);
  }

  return date;
}

function filters(req: Request) {
  return {
    projectId: readString(req.query.projectId),
    clientId: readString(req.query.clientId),
    developerId: readString(req.query.developerId),
    status: readString(req.query.status),
    fromDate: readDate(req.query.fromDate, "fromDate"),
    toDate: readDate(req.query.toDate, "toDate")
  };
}

export const advancedReportController = {
  projects: asyncHandler(async (req: Request, res: Response) => {
    const data = await advancedReportService.getProjectReport(req.user!, filters(req));
    res.json({ success: true, data });
  }),

  developers: asyncHandler(async (req: Request, res: Response) => {
    const data = await advancedReportService.getDeveloperReport(req.user!, filters(req));
    res.json({ success: true, data });
  }),

  team: asyncHandler(async (req: Request, res: Response) => {
    const data = await advancedReportService.getTeamReport(req.user!, filters(req));
    res.json({ success: true, data });
  }),

  costing: asyncHandler(async (req: Request, res: Response) => {
    const data = await advancedReportService.getCostingReport(req.user!, filters(req));
    res.json({ success: true, data });
  }),

  estimatedVsActual: asyncHandler(async (req: Request, res: Response) => {
    const data = await advancedReportService.getEstimatedVsActualReport(req.user!, filters(req));
    res.json({ success: true, data });
  }),

  budgetOverruns: asyncHandler(async (req: Request, res: Response) => {
    const data = await advancedReportService.getBudgetOverrunReport(req.user!, filters(req));
    res.json({ success: true, data });
  })
};
