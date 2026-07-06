import { prisma } from "../prisma/client.js";

export const reportRepository = {
  listTaskUpdates(projectId: string, reportDate?: Date) {
    return prisma.taskUpdate.findMany({
      where: {
        projectId,
        ...(reportDate ? { updateDate: reportDate } : {})
      },
      orderBy: { createdAt: "desc" },
      include: {
        task: { select: { id: true, title: true, status: true, progressPercentage: true } },
        developer: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });
  },

  listDailyReports(projectId: string, reportDate?: Date) {
    return prisma.dailyReport.findMany({
      where: {
        projectId,
        ...(reportDate ? { reportDate } : {})
      },
      orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
      include: {
        developer: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });
  }
};
