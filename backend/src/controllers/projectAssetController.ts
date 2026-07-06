import type { Request, Response } from "express";
import { projectAssetService } from "../services/projectAssetService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function readParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_ROUTE_PARAM", `Route parameter '${name}' is required`);
  }

  return value;
}

export const projectAssetController = {
  listAttachments: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectAssetService.listAttachments(readParam(req.params.projectId, "projectId"), req.user!);
    res.json({ success: true, data });
  }),

  createAttachment: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectAssetService.createAttachment(readParam(req.params.projectId, "projectId"), req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  updateAttachment: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectAssetService.updateAttachment(
      readParam(req.params.projectId, "projectId"),
      readParam(req.params.attachmentId, "attachmentId"),
      req.body,
      req.user!
    );
    res.json({ success: true, data });
  }),

  deleteAttachment: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectAssetService.deleteAttachment(
      readParam(req.params.projectId, "projectId"),
      readParam(req.params.attachmentId, "attachmentId"),
      req.user!
    );
    res.json({ success: true, data });
  }),

  listLinks: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectAssetService.listLinks(readParam(req.params.projectId, "projectId"), req.user!);
    res.json({ success: true, data });
  }),

  createLink: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectAssetService.createLink(readParam(req.params.projectId, "projectId"), req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  updateLink: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectAssetService.updateLink(
      readParam(req.params.projectId, "projectId"),
      readParam(req.params.linkId, "linkId"),
      req.body,
      req.user!
    );
    res.json({ success: true, data });
  }),

  deleteLink: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectAssetService.deleteLink(
      readParam(req.params.projectId, "projectId"),
      readParam(req.params.linkId, "linkId"),
      req.user!
    );
    res.json({ success: true, data });
  }),

  listCredentials: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectAssetService.listCredentials(readParam(req.params.projectId, "projectId"), req.user!);
    res.json({ success: true, data });
  }),

  revealCredential: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectAssetService.getCredentialSecret(
      readParam(req.params.projectId, "projectId"),
      readParam(req.params.credentialId, "credentialId"),
      req.user!
    );
    res.json({ success: true, data });
  }),

  createCredential: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectAssetService.createCredential(readParam(req.params.projectId, "projectId"), req.body, req.user!);
    res.status(201).json({ success: true, data });
  }),

  updateCredential: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectAssetService.updateCredential(
      readParam(req.params.projectId, "projectId"),
      readParam(req.params.credentialId, "credentialId"),
      req.body,
      req.user!
    );
    res.json({ success: true, data });
  }),

  deleteCredential: asyncHandler(async (req: Request, res: Response) => {
    const data = await projectAssetService.deleteCredential(
      readParam(req.params.projectId, "projectId"),
      readParam(req.params.credentialId, "credentialId"),
      req.user!
    );
    res.json({ success: true, data });
  })
};
