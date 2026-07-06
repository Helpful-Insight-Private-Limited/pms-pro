import { prisma } from "../prisma/client.js";

const milestoneInclude = {
  responsibleUser: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    }
  },
  project: {
    select: {
      id: true,
      title: true,
      code: true,
      status: true
    }
  }
} as const;

export const milestoneRepository = {
  listByProject(projectId: string) {
    return prisma.milestone.findMany({
      where: {
        projectId,
        deletedAt: null
      },
      orderBy: [
        { dueDate: "asc" },
        { createdAt: "desc" }
      ],
      include: milestoneInclude
    });
  },

  findById(projectId: string, id: string) {
    return prisma.milestone.findFirst({
      where: {
        id,
        projectId,
        deletedAt: null
      },
      include: milestoneInclude
    });
  },

  findDelayedCandidates(projectId: string, asOf: Date) {
    return prisma.milestone.findMany({
      where: {
        projectId,
        deletedAt: null,
        isActive: true,
        dueDate: {
          lt: asOf
        },
        status: {
          notIn: ["COMPLETED", "DELAYED"]
        }
      }
    });
  }
};
