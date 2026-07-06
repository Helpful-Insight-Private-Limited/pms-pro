import { prisma } from "../prisma/client.js";

export const permissionRepository = {
  list() {
    return prisma.permission.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ module: "asc" }, { action: "asc" }]
    });
  }
};
