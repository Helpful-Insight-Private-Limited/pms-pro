import type { Request, Response } from "express";
import { calendarService } from "../services/calendarService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function readParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_ROUTE_PARAM", `Route parameter '${name}' is required`);
  }

  return value;
}

export const calendarController = {
  listEvents: asyncHandler(async (req: Request, res: Response) => {
    const data = await calendarService.listEvents(req.query, req.user!);
    res.json({ success: true, data });
  }),

  createEvent: asyncHandler(async (req: Request, res: Response) => {
    const data = await calendarService.createEvent(req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  updateEvent: asyncHandler(async (req: Request, res: Response) => {
    const data = await calendarService.updateEvent(readParam(req.params.id, "id"), req.body, req.user!);
    res.json({ success: true, data });
  }),

  deleteEvent: asyncHandler(async (req: Request, res: Response) => {
    const data = await calendarService.deleteEvent(readParam(req.params.id, "id"), req.user!);
    res.json({ success: true, data });
  }),

  listLeaves: asyncHandler(async (req: Request, res: Response) => {
    const data = await calendarService.listLeaves(req.query, req.user!);
    res.json({ success: true, data });
  }),

  createLeave: asyncHandler(async (req: Request, res: Response) => {
    const data = await calendarService.createLeave(req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  updateLeave: asyncHandler(async (req: Request, res: Response) => {
    const data = await calendarService.updateLeave(readParam(req.params.id, "id"), req.body, req.user!);
    res.json({ success: true, data });
  }),

  deleteLeave: asyncHandler(async (req: Request, res: Response) => {
    const data = await calendarService.deleteLeave(readParam(req.params.id, "id"), req.user!);
    res.json({ success: true, data });
  }),

  listHolidays: asyncHandler(async (req: Request, res: Response) => {
    const data = await calendarService.listHolidays(req.query);
    res.json({ success: true, data });
  }),

  createHoliday: asyncHandler(async (req: Request, res: Response) => {
    const data = await calendarService.createHoliday(req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  updateHoliday: asyncHandler(async (req: Request, res: Response) => {
    const data = await calendarService.updateHoliday(readParam(req.params.id, "id"), req.body, req.user!);
    res.json({ success: true, data });
  }),

  deleteHoliday: asyncHandler(async (req: Request, res: Response) => {
    const data = await calendarService.deleteHoliday(readParam(req.params.id, "id"), req.user!);
    res.json({ success: true, data });
  }),

  availability: asyncHandler(async (req: Request, res: Response) => {
    const data = await calendarService.getAvailability(req.query, req.user!);
    res.json({ success: true, data });
  }),

  workload: asyncHandler(async (req: Request, res: Response) => {
    const data = await calendarService.getWorkload(req.query, req.user!);
    res.json({ success: true, data });
  })
};
