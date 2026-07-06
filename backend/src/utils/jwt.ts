import { jwtVerify, SignJWT } from "jose";
import { env } from "../config/env.js";
import type { AuthUser } from "../types/auth.js";

const textEncoder = new TextEncoder();

function accessSecret() {
  return textEncoder.encode(env.jwtAccessSecret);
}

export async function signAccessToken(user: AuthUser) {
  return new SignJWT({
    email: user.email,
    roles: user.roles,
    permissions: user.permissions
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(env.accessTokenTtl)
    .sign(accessSecret());
}

export async function verifyAccessToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, accessSecret());

  if (!payload.sub || typeof payload.email !== "string") {
    throw new Error("Invalid token payload");
  }

  return {
    id: payload.sub,
    email: payload.email,
    roles: Array.isArray(payload.roles) ? payload.roles.filter((role): role is string => typeof role === "string") : [],
    permissions: Array.isArray(payload.permissions)
      ? payload.permissions.filter((permission): permission is string => typeof permission === "string")
      : []
  };
}
