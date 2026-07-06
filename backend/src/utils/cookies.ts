import type { Response } from "express";
import { env } from "../config/env.js";

const refreshCookieName = "refreshToken";

export function setRefreshTokenCookie(res: Response, refreshToken: string) {
  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    path: "/auth"
  });
}

export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/auth"
  });
}

export function readRefreshTokenCookie(cookies: Record<string, unknown>) {
  const token = cookies[refreshCookieName];
  return typeof token === "string" ? token : null;
}
