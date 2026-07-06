import type { Request, Response } from "express";
import { activityLogService } from "../services/activityLogService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function readParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string") throw new ApiError(400, "INVALID_ROUTE_PARAM", `Route parameter '${name}' is required`);
  return value;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readDate(value: unknown, field: string) {
  const raw = readString(value);
  if (!raw) return undefined;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, "INVALID_ACTIVITY_LOG_FILTER", `${field} must be a valid date`);
  }

  return date;
}

function readInteger(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function filters(req: Request) {
  return {
    actorId: readString(req.query.actorId),
    action: readString(req.query.action),
    module: readString(req.query.module),
    entityType: readString(req.query.entityType),
    entityId: readString(req.query.entityId),
    projectId: readString(req.query.projectId),
    taskId: readString(req.query.taskId),
    search: readString(req.query.search),
    fromDate: readDate(req.query.fromDate, "fromDate"),
    toDate: readDate(req.query.toDate, "toDate"),
    page: readInteger(req.query.page, 1, 1, 100000),
    pageSize: readInteger(req.query.pageSize, 25, 1, 100)
  };
}

export const activityLogController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const data = await activityLogService.list(req.user!, filters(req));
    res.json({ success: true, data });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await activityLogService.getById(readParam(req.params.id, "id"), req.user!);
    res.json({ success: true, data });
  })
};
