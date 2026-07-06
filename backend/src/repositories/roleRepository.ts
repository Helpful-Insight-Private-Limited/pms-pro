import { prisma } from "../prisma/client.js";

export const roleRepository = {
  list() {
    return prisma.role.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      include: {
        rolePermissions: {
          include: { permission: true }
        }
      }
    });
  },

  findById(id: string) {
    return prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: { permission: true }
        }
      }
    });
  }
};
