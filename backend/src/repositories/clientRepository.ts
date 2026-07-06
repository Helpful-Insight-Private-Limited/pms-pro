import { prisma } from "../prisma/client.js";

export const clientRepository = {
  list() {
    return prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { projects: true }
        }
      }
    });
  },

  findById(id: string) {
    return prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: { projects: true }
        }
      }
    });
  },

  findByCode(code: string) {
    return prisma.client.findFirst({
      where: { code, deletedAt: null }
    });
  }
};
