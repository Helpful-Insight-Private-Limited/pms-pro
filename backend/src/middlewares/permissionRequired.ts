import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError.js";

export function permissionRequired(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new ApiError(401, "UNAUTHORIZED", "Authentication is required"));
      return;
    }

    if (req.user.roles.includes("admin") || req.user.permissions.includes(permission)) {
      next();
      return;
    }

    next(new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action"));
  };
}

export function anyPermissionRequired(permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new ApiError(401, "UNAUTHORIZED", "Authentication is required"));
      return;
    }

    if (req.user.roles.includes("admin") || permissions.some((permission) => req.user!.permissions.includes(permission))) {
      next();
      return;
    }

    next(new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action"));
  };
}

export function allPermissionsRequired(permissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new ApiError(401, "UNAUTHORIZED", "Authentication is required"));
      return;
    }

    if (req.user.roles.includes("admin") || permissions.every((permission) => req.user!.permissions.includes(permission))) {
      next();
      return;
    }

    next(new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action"));
  };
}
