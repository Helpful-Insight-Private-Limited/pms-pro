import { prisma } from "../dist/src/prisma/client.js";
import { hashPassword } from "../dist/src/utils/password.js";

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
