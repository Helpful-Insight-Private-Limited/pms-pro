import type { Request, Response } from "express";
import { authService } from "../services/authService.js";
import { activityLogService } from "../services/activityLogService.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.login(
      {
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      },
      res
    );

    await activityLogService.create({
      actorId: data.user.id,
      action: "auth.login",
      module: "auth",
      entityType: "User",
      entityId: data.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: { email: data.user.email }
    });

    res.json({ success: true, data });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.refresh(req.cookies ?? {}, res, {
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });

    res.json({ success: true, data });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.cookies ?? {}, res);
    await activityLogService.create({
      actorId: req.user!.id,
      action: "auth.logout",
      module: "auth",
      entityType: "User",
      entityId: req.user!.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
    res.json({ success: true, message: "Logged out successfully" });
  }),

  logoutAll: asyncHandler(async (req: Request, res: Response) => {
    await authService.logoutAll(req.user!.id, res);
    await activityLogService.create({
      actorId: req.user!.id,
      action: "auth.logoutAll",
      module: "auth",
      entityType: "User",
      entityId: req.user!.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
    res.json({ success: true, message: "All sessions logged out successfully" });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.me(req.user!.id);
    res.json({ success: true, data });
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const data = await authService.updateProfile(req.user!.id, req.body);
    await activityLogService.create({
      actorId: req.user!.id,
      action: "auth.profileUpdated",
      module: "auth",
      entityType: "User",
      entityId: req.user!.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
    res.json({ success: true, data });
  }),

  uploadAvatar: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ApiError(422, "AVATAR_REQUIRED", "Profile picture file is required");
    }

    const avatarUrl = `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`;
    const data = await authService.updateProfileAvatar(req.user!.id, avatarUrl);
    await activityLogService.create({
      actorId: req.user!.id,
      action: "auth.avatarUpdated",
      module: "auth",
      entityType: "User",
      entityId: req.user!.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
    res.json({ success: true, data });
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    await authService.changePassword(req.user!.id, req.body);
    await activityLogService.create({
      actorId: req.user!.id,
      action: "auth.passwordChanged",
      module: "auth",
      entityType: "User",
      entityId: req.user!.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent")
    });
    res.json({ success: true, message: "Password changed successfully" });
  })
};
