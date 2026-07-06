import { prisma } from "../prisma/client.js";
import { reportRepository } from "../repositories/reportRepository.js";
import { projectService } from "./projectService.js";
import { taskService } from "./taskService.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";

type TaskUpdateInput = {
  currentStatus: "TODO" | "IN_PROGRESS" | "REVIEW" | "TESTING" | "COMPLETED" | "BLOCKED" | "HOLD";
  progressPercentage: number;
  workDoneToday: string;
  planForTomorrow?: string | null;
  blockers?: string | null;
  timeSpent: number;
  updateDate?: Date;
};

function dateOnly(input = new Date()) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function canUpdateTaskForUser(task: { assignedDeveloperId: string | null }, user: AuthUser) {
  return user.roles.includes("admin") || user.permissions.includes("task.assign") || task.assignedDeveloperId === user.id;
}

function joinNonEmpty(values: Array<string | null | undefined>) {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)).join("\n");
}

function buildGeneratedSummary(updates: Array<{ task: { title: string }; workDoneToday: string; currentStatus: string; progressPercentage: unknown }>) {
  return updates
    .map((update) => `${update.task.title}: ${update.workDoneToday} (${update.currentStatus}, ${Number(update.progressPercentage)}%)`)
    .join("\n");
}

export const reportService = {
  async createTaskUpdate(projectId: string, taskId: string, input: TaskUpdateInput, user: AuthUser) {
    const task = await taskService.getTask(projectId, taskId, user);

    if (!canUpdateTaskForUser(task, user)) {
      throw new ApiError(403, "FORBIDDEN", "Only the assigned developer or task managers can update this task");
    }

    const updateDate = dateOnly(input.updateDate);

    const taskUpdate = await prisma.$transaction(async (tx) => {
      const createdUpdate = await tx.taskUpdate.create({
        data: {
          taskId,
          projectId,
          developerId: user.id,
          previousStatus: task.status,
          currentStatus: input.currentStatus,
          progressPercentage: input.progressPercentage,
          workDoneToday: input.workDoneToday,
          planForTomorrow: input.planForTomorrow,
          blockers: input.blockers,
          timeSpent: input.timeSpent,
          updateDate
        }
      });

      await tx.task.update({
        where: { id: taskId },
        data: {
          status: input.currentStatus,
          progressPercentage: input.currentStatus === "COMPLETED" ? 100 : input.progressPercentage,
          actualHours: Number(task.actualHours) + input.timeSpent,
          completedDate: input.currentStatus === "COMPLETED" ? new Date() : task.completedDate,
          updatedBy: user.id
        }
      });

      return createdUpdate;
    });

    return taskUpdate;
  },

  async listTaskUpdates(projectId: string, user: AuthUser, reportDate?: Date) {
    await projectService.getProjectById(projectId, user);
    return reportRepository.listTaskUpdates(projectId, reportDate ? dateOnly(reportDate) : undefined);
  },

  async generateDailyReports(projectId: string, user: AuthUser, reportDateInput?: Date) {
    await projectService.getProjectById(projectId, user);
    const reportDate = dateOnly(reportDateInput);
    const updates = await prisma.taskUpdate.findMany({
      where: { projectId, updateDate: reportDate },
      include: { task: { select: { id: true, title: true } } }
    });

    const grouped = new Map<string, typeof updates>();

    for (const update of updates) {
      const current = grouped.get(update.developerId) ?? [];
      current.push(update);
      grouped.set(update.developerId, current);
    }

    const reports = [];

    for (const [developerId, developerUpdates] of grouped.entries()) {
      const totalHoursSpent = developerUpdates.reduce((sum, update) => sum + Number(update.timeSpent), 0);
      const generatedSummary = buildGeneratedSummary(developerUpdates);
      const blockersSummary = joinNonEmpty(developerUpdates.map((update) => update.blockers));
      const tomorrowPlanSummary = joinNonEmpty(developerUpdates.map((update) => update.planForTomorrow));

      const report = await prisma.dailyReport.upsert({
        where: {
          developerId_projectId_reportDate: {
            developerId,
            projectId,
            reportDate
          }
        },
        update: {
          generatedSummary,
          totalTasksUpdated: developerUpdates.length,
          totalHoursSpent,
          blockersSummary,
          tomorrowPlanSummary,
          generatedAt: new Date()
        },
        create: {
          developerId,
          projectId,
          reportDate,
          generatedSummary,
          totalTasksUpdated: developerUpdates.length,
          totalHoursSpent,
          blockersSummary,
          tomorrowPlanSummary
        }
      });

      reports.push(report);
    }

    return reports;
  },

  async listDailyReports(projectId: string, user: AuthUser, reportDate?: Date) {
    await projectService.getProjectById(projectId, user);
    return reportRepository.listDailyReports(projectId, reportDate ? dateOnly(reportDate) : undefined);
  },

  async getDailySummary(projectId: string, user: AuthUser, reportDateInput?: Date) {
    await projectService.getProjectById(projectId, user);
    const reportDate = dateOnly(reportDateInput);

    const [updates, tasks, blockers] = await Promise.all([
      prisma.taskUpdate.findMany({ where: { projectId, updateDate: reportDate }, include: { task: true } }),
      prisma.task.findMany({ where: { projectId, deletedAt: null, isActive: true } }),
      prisma.taskBlocker.findMany({
        where: {
          deletedAt: null,
          isResolved: false,
          task: { projectId }
        },
        include: { task: { select: { id: true, title: true } } }
      })
    ]);

    const updatedTaskIds = new Set(updates.map((update) => update.taskId));

    return {
      reportDate,
      totalTaskUpdates: updates.length,
      blockersRaisedToday: updates.filter((update) => update.blockers?.trim()).length,
      tasksMovedToReview: updates.filter((update) => update.currentStatus === "REVIEW").length,
      tasksMovedToTesting: updates.filter((update) => update.currentStatus === "TESTING").length,
      tasksCompleted: updates.filter((update) => update.currentStatus === "COMPLETED").length,
      tasksWithNoUpdateToday: tasks.filter((task) => !updatedTaskIds.has(task.id)).map((task) => ({
        id: task.id,
        title: task.title,
        assignedDeveloperId: task.assignedDeveloperId,
        status: task.status
      })),
      openBlockers: blockers.map((blocker) => ({
        id: blocker.id,
        taskId: blocker.taskId,
        taskTitle: blocker.task.title,
        description: blocker.description,
        reportedBy: blocker.reportedBy
      }))
    };
  }
};
