import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

const algorithm = "aes-256-gcm";

function encryptionKey() {
  const rawKey = env.credentialEncryptionKey;
  const base64Key = Buffer.from(rawKey, "base64");

  if (base64Key.length === 32) {
    return base64Key;
  }

  return createHash("sha256").update(rawKey).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedValue: encrypted.toString("base64"),
    encryptionIv: iv.toString("base64"),
    authTag: authTag.toString("base64")
  };
}

export function decryptSecret(input: { encryptedValue: string; encryptionIv: string; authTag: string }) {
  const decipher = createDecipheriv(algorithm, encryptionKey(), Buffer.from(input.encryptionIv, "base64"));
  decipher.setAuthTag(Buffer.from(input.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(input.encryptedValue, "base64")),
    decipher.final()
  ]).toString("utf8");
}
