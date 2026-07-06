import type { NextFunction, Request, Response } from "express";
import { authRepository } from "../repositories/authRepository.js";
import { ApiError } from "../utils/apiError.js";
import { verifyAccessToken } from "../utils/jwt.js";

export async function authRequired(req: Request, _res: Response, next: NextFunction) {
  try {
    const authorization = req.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication is required");
    }

    const token = authorization.slice("Bearer ".length);
    const authUser = await verifyAccessToken(token);
    const user = await authRepository.findUserById(authUser.id);

    if (!user || user.deletedAt || !user.isActive || user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
      throw new ApiError(401, "UNAUTHORIZED", "Authentication is required");
    }

    req.user = authUser;
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, "UNAUTHORIZED", "Authentication is required"));
  }
}
