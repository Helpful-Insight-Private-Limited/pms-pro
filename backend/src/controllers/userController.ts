import type { Request, Response } from "express";
import { userService } from "../services/userService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

function readParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_ROUTE_PARAM", `Route parameter '${name}' is required`);
  }

  return value;
}

export const userController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.createUser(req.body);
    res.status(201).json({ success: true, data });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.listUsers(req.user!);
    res.json({ success: true, data });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.getUserById(readParam(req.params.id, "id"));
    res.json({ success: true, data });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.updateUser(readParam(req.params.id, "id"), req.body);
    res.json({ success: true, data });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.softDeleteUser(readParam(req.params.id, "id"));
    res.json({ success: true, data });
  }),

  assignRoles: asyncHandler(async (req: Request, res: Response) => {
    const data = await userService.assignRoles(readParam(req.params.id, "id"), req.body.roleIds, req.user?.id);
    res.json({ success: true, data });
  })
};
