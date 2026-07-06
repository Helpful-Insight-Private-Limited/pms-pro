import type { Request, Response } from "express";
import { taskService } from "../services/taskService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function readParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string") throw new ApiError(400, "INVALID_ROUTE_PARAM", `Route parameter '${name}' is required`);
  return value;
}

export const taskController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const data = await taskService.listTasks(readParam(req.params.projectId, "projectId"), req.user!);
    res.json({ success: true, data });
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const data = await taskService.createTask(readParam(req.params.projectId, "projectId"), req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),
  getById: asyncHandler(async (req: Request, res: Response) => {
    const data = await taskService.getTask(readParam(req.params.projectId, "projectId"), readParam(req.params.taskId, "taskId"), req.user!);
    res.json({ success: true, data });
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const data = await taskService.updateTask(readParam(req.params.projectId, "projectId"), readParam(req.params.taskId, "taskId"), req.body, req.user!);
    res.json({ success: true, data });
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    const data = await taskService.deleteTask(readParam(req.params.projectId, "projectId"), readParam(req.params.taskId, "taskId"), req.user!);
    res.json({ success: true, data });
  }),
  listComments: asyncHandler(async (req: Request, res: Response) => {
    const data = await taskService.listComments(readParam(req.params.projectId, "projectId"), readParam(req.params.taskId, "taskId"), req.user!);
    res.json({ success: true, data });
  }),
  addComment: asyncHandler(async (req: Request, res: Response) => {
    const data = await taskService.addComment(readParam(req.params.projectId, "projectId"), readParam(req.params.taskId, "taskId"), req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),
  addBlocker: asyncHandler(async (req: Request, res: Response) => {
    const data = await taskService.addBlocker(readParam(req.params.projectId, "projectId"), readParam(req.params.taskId, "taskId"), req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),
  updateBlocker: asyncHandler(async (req: Request, res: Response) => {
    const data = await taskService.updateBlocker(
      readParam(req.params.projectId, "projectId"),
      readParam(req.params.taskId, "taskId"),
      readParam(req.params.blockerId, "blockerId"),
      req.body,
      req.user!
    );
    res.json({ success: true, data });
  }),
  listAttachments: asyncHandler(async (req: Request, res: Response) => {
    const data = await taskService.listAttachments(readParam(req.params.projectId, "projectId"), readParam(req.params.taskId, "taskId"), req.user!);
    res.json({ success: true, data });
  }),
  addAttachment: asyncHandler(async (req: Request, res: Response) => {
    const data = await taskService.addAttachment(readParam(req.params.projectId, "projectId"), readParam(req.params.taskId, "taskId"), req.body, req.user!);
    res.status(201).json({ success: true, data });
  })
};
