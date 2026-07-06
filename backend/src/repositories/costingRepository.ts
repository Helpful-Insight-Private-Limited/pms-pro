import { prisma } from "../prisma/client.js";

export const costingRepository = {
  listProjectTimeLogs(projectId: string) {
    return prisma.taskTimeLog.findMany({
      where: { projectId },
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
      include: {
        task: { select: { id: true, title: true, milestoneId: true, sprintId: true } },
        developer: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });
  },

  listTaskTimeLogs(projectId: string, taskId: string) {
    return prisma.taskTimeLog.findMany({
      where: { projectId, taskId },
      orderBy: [{ workDate: "desc" }, { createdAt: "desc" }],
      include: {
        developer: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });
  },

  findDeveloperRateForDate(developerId: string, workDate: Date) {
    return prisma.developerRate.findFirst({
      where: {
        developerId,
        effectiveFrom: { lte: workDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: workDate } }],
        deletedAt: null,
        isActive: true
      },
      orderBy: { effectiveFrom: "desc" }
    });
  },

  listProjectTasks(projectId: string) {
    return prisma.task.findMany({
      where: { projectId, deletedAt: null, isActive: true },
      select: {
        id: true,
        title: true,
        milestoneId: true,
        sprintId: true,
        assignedDeveloperId: true,
        estimatedHours: true,
        actualHours: true
      }
    });
  }
};
