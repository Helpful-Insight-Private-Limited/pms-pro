import { prisma } from "../prisma/client.js";
import { costingRepository } from "../repositories/costingRepository.js";
import { activityLogService } from "./activityLogService.js";
import { projectService } from "./projectService.js";
import { taskService } from "./taskService.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";

type TimeLogInput = {
  developerId?: string;
  workDate?: Date;
  hoursWorked: number;
  description?: string | null;
};

type TimerInput = {
  description?: string | null;
};

type CostBucket = {
  id: string;
  label?: string;
  totalHours: number;
  actualCost: number;
  actualBilling: number;
  profitLoss: number;
};

function dateOnly(input = new Date()) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function canManageTaskTime(user: AuthUser) {
  return user.roles.includes("admin") || user.permissions.includes("task.assign");
}

function canLogTimeForTask(task: { assignedDeveloperId: string | null }, developerId: string, user: AuthUser) {
  return canManageTaskTime(user) || (developerId === user.id && task.assignedDeveloperId === user.id);
}

function addToBucket(buckets: Map<string, CostBucket>, id: string, label: string | undefined, hours: number, cost: number, billing: number) {
  const existing = buckets.get(id) ?? {
    id,
    label,
    totalHours: 0,
    actualCost: 0,
    actualBilling: 0,
    profitLoss: 0
  };

  existing.totalHours += hours;
  existing.actualCost += cost;
  existing.actualBilling += billing;
  existing.profitLoss += billing - cost;
  buckets.set(id, existing);
}

function finalizeBuckets(buckets: Map<string, CostBucket>) {
  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    totalHours: money(bucket.totalHours),
    actualCost: money(bucket.actualCost),
    actualBilling: money(bucket.actualBilling),
    profitLoss: money(bucket.profitLoss)
  }));
}

async function assertDeveloperBelongsToProject(project: Awaited<ReturnType<typeof projectService.getProjectById>>, developerId: string) {
  const memberIds = new Set([
    project.projectManagerId,
    project.teamLeaderId,
    ...project.members.map((member) => member.userId)
  ].filter((userId): userId is string => Boolean(userId)));

  if (!memberIds.has(developerId)) {
    throw new ApiError(400, "INVALID_PROJECT_DEVELOPER", "Developer must belong to the project");
  }
}

export const costingService = {
  async createTimeLog(projectId: string, taskId: string, input: TimeLogInput, user: AuthUser) {
    const project = await projectService.getProjectById(projectId, user);
    const task = await taskService.getTask(projectId, taskId, user);
    const developerId = input.developerId ?? user.id;

    await assertDeveloperBelongsToProject(project, developerId);

    if (!canLogTimeForTask(task, developerId, user)) {
      throw new ApiError(403, "FORBIDDEN", "Only the assigned developer or task managers can log time for this task");
    }

    const workDate = dateOnly(input.workDate);

    const created = await prisma.$transaction(async (tx) => {
      const timeLog = await tx.taskTimeLog.create({
        data: {
          projectId,
          taskId,
          developerId,
          workDate,
          hoursWorked: input.hoursWorked,
          description: input.description
        },
        include: {
          developer: { select: { id: true, firstName: true, lastName: true, email: true } },
          task: { select: { id: true, title: true } }
        }
      });

      await tx.task.update({
        where: { id: taskId },
        data: {
          actualHours: { increment: input.hoursWorked },
          updatedBy: user.id
        }
      });

      return timeLog;
    });

    await activityLogService.create({
      actorId: user.id,
      action: "costing.timeLogged",
      module: "costing",
      entityType: "TaskTimeLog",
      entityId: created.id,
      projectId,
      taskId,
      metadata: {
        developerId,
        workDate,
        hoursWorked: input.hoursWorked
      }
    });

    return created;
  },

  async startTaskTimer(projectId: string, taskId: string, input: TimerInput, user: AuthUser) {
    const project = await projectService.getProjectById(projectId, user);
    const task = await taskService.getTask(projectId, taskId, user);
    const developerId = user.id;

    await assertDeveloperBelongsToProject(project, developerId);

    if (!canLogTimeForTask(task, developerId, user)) {
      throw new ApiError(403, "FORBIDDEN", "Only the assigned developer or task managers can start a timer for this task");
    }

    const activeTimer = await prisma.taskTimer.findFirst({
      where: { developerId, stoppedAt: null },
      include: { task: { select: { id: true, title: true } }, project: { select: { id: true, title: true, code: true } } }
    });

    if (activeTimer) {
      throw new ApiError(409, "ACTIVE_TIMER_EXISTS", `Stop the active timer for ${activeTimer.task.title} before starting a new timer`);
    }

    const timer = await prisma.taskTimer.create({
      data: {
        projectId,
        taskId,
        developerId,
        description: input.description?.trim() ? input.description.trim() : null
      },
      include: {
        developer: { select: { id: true, firstName: true, lastName: true, email: true } },
        task: { select: { id: true, title: true } },
        project: { select: { id: true, title: true, code: true } }
      }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "costing.timerStarted",
      module: "costing",
      entityType: "TaskTimer",
      entityId: timer.id,
      projectId,
      taskId,
      metadata: { developerId, startedAt: timer.startedAt }
    });

    return timer;
  },

  async stopTaskTimer(projectId: string, taskId: string, input: TimerInput, user: AuthUser) {
    const project = await projectService.getProjectById(projectId, user);
    const task = await taskService.getTask(projectId, taskId, user);
    const developerId = user.id;

    await assertDeveloperBelongsToProject(project, developerId);

    if (!canLogTimeForTask(task, developerId, user)) {
      throw new ApiError(403, "FORBIDDEN", "Only the assigned developer or task managers can stop this timer");
    }

    const activeTimer = await prisma.taskTimer.findFirst({
      where: { projectId, taskId, developerId, stoppedAt: null }
    });

    if (!activeTimer) {
      throw new ApiError(404, "ACTIVE_TIMER_NOT_FOUND", "No active timer found for this task");
    }

    const stoppedAt = new Date();
    const durationMinutes = Math.max(1, Math.round((stoppedAt.getTime() - activeTimer.startedAt.getTime()) / 60000));
    const hoursWorked = money(durationMinutes / 60);
    const description = input.description?.trim() || activeTimer.description || "Tracked with task timer";
    const workDate = dateOnly(stoppedAt);

    const result = await prisma.$transaction(async (tx) => {
      const timer = await tx.taskTimer.update({
        where: { id: activeTimer.id },
        data: { stoppedAt, durationMinutes, description },
        include: {
          developer: { select: { id: true, firstName: true, lastName: true, email: true } },
          task: { select: { id: true, title: true } },
          project: { select: { id: true, title: true, code: true } }
        }
      });

      const timeLog = await tx.taskTimeLog.create({
        data: {
          projectId,
          taskId,
          developerId,
          workDate,
          hoursWorked,
          description
        },
        include: {
          developer: { select: { id: true, firstName: true, lastName: true, email: true } },
          task: { select: { id: true, title: true } }
        }
      });

      await tx.task.update({
        where: { id: taskId },
        data: {
          actualHours: { increment: hoursWorked },
          updatedBy: user.id
        }
      });

      return { timer, timeLog };
    });

    await activityLogService.create({
      actorId: user.id,
      action: "costing.timerStopped",
      module: "costing",
      entityType: "TaskTimer",
      entityId: result.timer.id,
      projectId,
      taskId,
      metadata: { developerId, durationMinutes, hoursWorked }
    });

    return result;
  },

  async getActiveTaskTimer(projectId: string, taskId: string, user: AuthUser) {
    await taskService.getTask(projectId, taskId, user);
    return prisma.taskTimer.findFirst({
      where: { projectId, taskId, developerId: user.id, stoppedAt: null },
      include: {
        developer: { select: { id: true, firstName: true, lastName: true, email: true } },
        task: { select: { id: true, title: true } },
        project: { select: { id: true, title: true, code: true } }
      }
    });
  },

  async listProjectTimeLogs(projectId: string, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    return costingRepository.listProjectTimeLogs(projectId);
  },

  async listTaskTimeLogs(projectId: string, taskId: string, user: AuthUser) {
    await taskService.getTask(projectId, taskId, user);
    return costingRepository.listTaskTimeLogs(projectId, taskId);
  },

  async getProjectCosting(projectId: string, user: AuthUser) {
    const project = await projectService.getProjectById(projectId, user);
    const [timeLogs, tasks] = await Promise.all([
      costingRepository.listProjectTimeLogs(projectId),
      costingRepository.listProjectTasks(projectId)
    ]);

    let totalHours = 0;
    let actualCost = 0;
    let actualBilling = 0;
    let estimatedHours = 0;
    let estimatedCost = 0;
    let estimatedBilling = 0;
    const missingRateLogIds: string[] = [];
    const developerBuckets = new Map<string, CostBucket>();
    const taskBuckets = new Map<string, CostBucket>();
    const sprintBuckets = new Map<string, CostBucket>();
    const milestoneBuckets = new Map<string, CostBucket>();

    for (const task of tasks) {
      const taskEstimatedHours = Number(task.estimatedHours);
      estimatedHours += taskEstimatedHours;

      if (task.assignedDeveloperId && taskEstimatedHours > 0) {
        const rate = await costingRepository.findDeveloperRateForDate(task.assignedDeveloperId, new Date());
        estimatedCost += taskEstimatedHours * Number(rate?.costPerHour ?? 0);
        estimatedBilling += taskEstimatedHours * Number(rate?.billingRatePerHour ?? 0);
      }
    }

    for (const log of timeLogs) {
      const rate = await costingRepository.findDeveloperRateForDate(log.developerId, log.workDate);
      const hours = Number(log.hoursWorked);
      const cost = hours * Number(rate?.costPerHour ?? 0);
      const billing = hours * Number(rate?.billingRatePerHour ?? 0);

      totalHours += hours;
      actualCost += cost;
      actualBilling += billing;

      if (!rate) {
        missingRateLogIds.push(log.id);
      }

      addToBucket(developerBuckets, log.developerId, log.developer.email, hours, cost, billing);
      addToBucket(taskBuckets, log.taskId, log.task.title, hours, cost, billing);

      if (log.task.sprintId) {
        addToBucket(sprintBuckets, log.task.sprintId, undefined, hours, cost, billing);
      }

      if (log.task.milestoneId) {
        addToBucket(milestoneBuckets, log.task.milestoneId, undefined, hours, cost, billing);
      }
    }

    const budget = Number(project.budget);
    const profitLoss = actualBilling - actualCost;

    const costing = {
      projectId,
      currency: project.currency,
      budget: money(budget),
      estimatedHours: money(estimatedHours),
      totalHours: money(totalHours),
      estimatedCost: money(estimatedCost),
      estimatedBilling: money(estimatedBilling),
      actualCost: money(actualCost),
      actualBilling: money(actualBilling),
      remainingBudget: money(budget - actualCost),
      budgetUtilizationPercentage: budget > 0 ? money((actualCost / budget) * 100) : 0,
      profitLoss: money(profitLoss),
      marginPercentage: actualBilling > 0 ? money((profitLoss / actualBilling) * 100) : 0,
      missingRateLogIds,
      developerWiseCost: finalizeBuckets(developerBuckets),
      taskWiseCost: finalizeBuckets(taskBuckets),
      sprintWiseCost: finalizeBuckets(sprintBuckets),
      milestoneWiseCost: finalizeBuckets(milestoneBuckets)
    };

    await activityLogService.create({
      actorId: user.id,
      action: "costing.viewed",
      module: "costing",
      entityType: "Project",
      entityId: projectId,
      projectId,
      metadata: {
        budget: costing.budget,
        actualCost: costing.actualCost,
        remainingBudget: costing.remainingBudget,
        budgetUtilizationPercentage: costing.budgetUtilizationPercentage
      }
    });

    return costing;
  }
};
