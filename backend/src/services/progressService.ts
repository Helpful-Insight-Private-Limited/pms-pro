import { prisma } from "../prisma/client.js";

function percentage(completed: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 10000) / 100;
}

async function taskCounts(where: { projectId: string; milestoneId?: string | null; sprintId?: string | null }) {
  const baseWhere = {
    projectId: where.projectId,
    deletedAt: null,
    isActive: true,
    ...(where.milestoneId !== undefined ? { milestoneId: where.milestoneId } : {}),
    ...(where.sprintId !== undefined ? { sprintId: where.sprintId } : {})
  };

  const [total, completed] = await Promise.all([
    prisma.task.count({ where: baseWhere }),
    prisma.task.count({ where: { ...baseWhere, status: "COMPLETED" } })
  ]);

  return { total, completed, progress: percentage(completed, total) };
}

export const progressService = {
  async recalculateProject(projectId: string) {
    const counts = await taskCounts({ projectId });
    await prisma.project.update({
      where: { id: projectId },
      data: { progressPercentage: counts.progress }
    });
    return counts;
  },

  async recalculateMilestone(projectId: string, milestoneId?: string | null) {
    if (!milestoneId) return null;
    const counts = await taskCounts({ projectId, milestoneId });
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        progressPercentage: counts.progress,
        status: counts.total > 0 && counts.completed === counts.total ? "COMPLETED" : undefined
      }
    });
    return counts;
  },

  async recalculateSprint(projectId: string, sprintId?: string | null) {
    if (!sprintId) return null;
    const counts = await taskCounts({ projectId, sprintId });
    await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        progressPercentage: counts.progress,
        status: counts.total > 0 && counts.completed === counts.total ? "COMPLETED" : undefined
      }
    });
    return counts;
  },

  async recalculateForTask(projectId: string, links: Array<{ milestoneId?: string | null; sprintId?: string | null }>) {
    const milestoneIds = [...new Set(links.map((link) => link.milestoneId).filter((id): id is string => Boolean(id)))];
    const sprintIds = [...new Set(links.map((link) => link.sprintId).filter((id): id is string => Boolean(id)))];

    await Promise.all([
      this.recalculateProject(projectId),
      ...milestoneIds.map((milestoneId) => this.recalculateMilestone(projectId, milestoneId)),
      ...sprintIds.map((sprintId) => this.recalculateSprint(projectId, sprintId))
    ]);
  }
};
