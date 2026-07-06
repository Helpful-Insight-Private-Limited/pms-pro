import type { Request, Response } from "express";
import { clientService } from "../services/clientService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function readParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_ROUTE_PARAM", `Route parameter '${name}' is required`);
  }

  return value;
}

export const clientController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await clientService.createClient(req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  list: asyncHandler(async (_req: Request, res: Response) => {
    const data = await clientService.listClients();
    res.json({ success: true, data });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await clientService.getClientById(readParam(req.params.id, "id"));
    res.json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await clientService.updateClient(readParam(req.params.id, "id"), req.body, req.user!);
    res.json({ success: true, data });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const data = await clientService.softDeleteClient(readParam(req.params.id, "id"), req.user!);
    res.json({ success: true, data });
  })
};
