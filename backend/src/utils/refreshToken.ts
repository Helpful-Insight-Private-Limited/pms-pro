import { createHash, randomBytes, randomUUID } from "node:crypto";

export function generateRefreshToken() {
  return randomBytes(48).toString("base64url");
}

export function generateTokenFamilyId() {
  return randomUUID();
}

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
