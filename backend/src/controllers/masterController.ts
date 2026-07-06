import type { Request, Response } from "express";
import { masterService } from "../services/masterService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function readParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_ROUTE_PARAM", `Route parameter '${name}' is required`);
  }

  return value;
}

export const masterController = {
  listCurrencies: asyncHandler(async (_req: Request, res: Response) => {
    const data = await masterService.listCurrencies();
    res.json({ success: true, data });
  }),

  createCurrency: asyncHandler(async (req: Request, res: Response) => {
    const data = await masterService.createCurrency(req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  updateCurrency: asyncHandler(async (req: Request, res: Response) => {
    const data = await masterService.updateCurrency(readParam(req.params.id, "id"), req.body, req.user!);
    res.json({ success: true, data });
  }),

  deleteCurrency: asyncHandler(async (req: Request, res: Response) => {
    const data = await masterService.deleteCurrency(readParam(req.params.id, "id"), req.user!);
    res.json({ success: true, data });
  }),

  listTechnologyStacks: asyncHandler(async (_req: Request, res: Response) => {
    const data = await masterService.listTechnologyStacks();
    res.json({ success: true, data });
  }),

  createTechnologyStack: asyncHandler(async (req: Request, res: Response) => {
    const data = await masterService.createTechnologyStack(req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  updateTechnologyStack: asyncHandler(async (req: Request, res: Response) => {
    const data = await masterService.updateTechnologyStack(readParam(req.params.id, "id"), req.body, req.user!);
    res.json({ success: true, data });
  }),

  deleteTechnologyStack: asyncHandler(async (req: Request, res: Response) => {
    const data = await masterService.deleteTechnologyStack(readParam(req.params.id, "id"), req.user!);
    res.json({ success: true, data });
  })
};
