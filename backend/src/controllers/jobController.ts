import type { Request, Response } from "express";
import { backgroundJobService } from "../services/backgroundJobService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function parseDate(value: unknown) {
  if (!value) return new Date();
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new ApiError(400, "INVALID_JOB_DATE", "Invalid job date");
  return date;
}

function readJobName(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string" && backgroundJobService.jobNames.includes(value as never)) {
    return value as (typeof backgroundJobService.jobNames)[number];
  }
  throw new ApiError(400, "INVALID_JOB_NAME", "Invalid job name");
}

export const jobController = {
  listRuns: asyncHandler(async (_req: Request, res: Response) => {
    const data = await backgroundJobService.listRuns();
    res.json({ success: true, data });
  }),

  run: asyncHandler(async (req: Request, res: Response) => {
    const date = parseDate(req.body?.date);
    const jobName = readJobName(req.body?.jobName);
    const data = jobName ? await backgroundJobService.runJob(jobName, date) : await backgroundJobService.runAll(date);
    res.json({ success: true, data });
  })
};
