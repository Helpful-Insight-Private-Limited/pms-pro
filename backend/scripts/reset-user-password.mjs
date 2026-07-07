import { prisma } from "../dist/src/prisma/client.js";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";

const scryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024
};

function scrypt(password, salt, length, options) {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scrypt(password, salt, 64, scryptOptions);

  return `scrypt$${scryptOptions.N}$${scryptOptions.r}$${scryptOptions.p}$${salt}$${derivedKey.toString("base64url")}`;
}

const email = process.env.USER_EMAIL;
const password = process.env.NEW_PASSWORD;

if (!email || !password) {
  console.error("Usage: USER_EMAIL=user@example.com NEW_PASSWORD='StrongPassword123' npm --workspace backend run user:reset-password");
  process.exit(1);
}

if (password.length < 10) {
  console.error("NEW_PASSWORD must be at least 10 characters.");
  process.exit(1);
}

const user = await prisma.user.findUnique({
  where: { email }
});

if (!user) {
  console.error(`User not found: ${email}`);
  process.exit(1);
}

await prisma.user.update({
  where: { id: user.id },
  data: {
    passwordHash: await hashPassword(password),
    isActive: true,
    deletedAt: null
  }
});

await prisma.refreshToken.updateMany({
  where: { userId: user.id, revokedAt: null },
  data: { revokedAt: new Date() }
});

console.log(`Password reset and active sessions revoked for ${email}.`);

await prisma.$disconnect();
