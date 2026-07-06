import { prisma } from "../prisma/client.js";

export const userRepository = {
  list() {
    return prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        userRoles: {
          where: { isActive: true, revokedAt: null },
          include: { role: true }
        },
        developerProfile: true
      }
    });
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          where: { isActive: true, revokedAt: null },
          include: { role: true }
        },
        developerProfile: true
      }
    });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }
};
