import { prisma } from "../prisma/client.js";

const sprintInclude = {
  project: {
    select: {
      id: true,
      title: true,
      code: true,
      status: true
    }
  },
  milestone: {
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      progressPercentage: true
    }
  }
} as const;

export const sprintRepository = {
  listByMilestone(projectId: string, milestoneId: string) {
    return prisma.sprint.findMany({
      where: {
        projectId,
        milestoneId,
        deletedAt: null
      },
      orderBy: [
        { startDate: "asc" },
        { createdAt: "desc" }
      ],
      include: sprintInclude
    });
  },

  findById(projectId: string, milestoneId: string, id: string) {
    return prisma.sprint.findFirst({
      where: {
        id,
        projectId,
        milestoneId,
        deletedAt: null
      },
      include: sprintInclude
    });
  }
};
