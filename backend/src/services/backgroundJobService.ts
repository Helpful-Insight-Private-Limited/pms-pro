import { prisma } from "../prisma/client.js";
import type { Prisma } from "../generated/prisma/index.js";
import { emitToUser } from "../realtime/socket.js";

type JobName =
  | "daily-report-generation"
  | "deadline-reminders"
  | "overdue-task-detection"
  | "delayed-milestone-detection"
  | "budget-threshold-alerts"
  | "daily-summary"
  | "weekly-summary";

type JobResult = {
  jobName: JobName;
  runKey: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  summary?: Prisma.InputJsonValue;
  errorMessage?: string;
};

function dateOnly(input = new Date()) {
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
}

function addDays(input: Date, days: number) {
  const next = new Date(input);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function runDateKey(input = new Date()) {
  return dateOnly(input).toISOString().slice(0, 10);
}

function weekKey(input = new Date()) {
  const date = dateOnly(input);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

async function createNotificationOnce(input: {
  userId: string;
  type: "SYSTEM" | "TASK_BLOCKED" | "MILESTONE_DUE" | "DAILY_REPORT";
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  since: Date;
}) {
  const existing = await prisma.userNotification.findFirst({
    where: {
      userId: input.userId,
      type: input.type,
      entityType: input.entityType,
      entityId: input.entityId,
      createdAt: { gte: input.since },
      deletedAt: null
    }
  });

  if (existing) return false;

  const notification = await prisma.userNotification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata
    }
  });
  emitToUser(input.userId, "notification.created", notification);

  return true;
}

async function withRunLog(jobName: JobName, runKey: string, handler: () => Promise<Prisma.InputJsonValue>): Promise<JobResult> {
  const existing = await prisma.backgroundJobRun.findUnique({ where: { runKey } });

  if (existing?.status === "SUCCESS") {
    return { jobName, runKey, status: "SKIPPED", summary: existing.summary ?? undefined };
  }

  const run = existing
    ? await prisma.backgroundJobRun.update({
        where: { runKey },
        data: { status: "RUNNING", startedAt: new Date(), finishedAt: null, errorMessage: null }
      })
    : await prisma.backgroundJobRun.create({ data: { jobName, runKey, status: "RUNNING" } });

  try {
    const summary = await handler();
    await prisma.backgroundJobRun.update({
      where: { id: run.id },
      data: { status: "SUCCESS", summary, finishedAt: new Date(), errorMessage: null }
    });
    return { jobName, runKey, status: "SUCCESS", summary };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown job failure";
    await prisma.backgroundJobRun.update({
      where: { id: run.id },
      data: { status: "FAILED", errorMessage, finishedAt: new Date() }
    });
    return { jobName, runKey, status: "FAILED", errorMessage };
  }
}

async function activeProjects() {
  return prisma.project.findMany({
    where: { deletedAt: null, isActive: true, status: { in: ["ACTIVE", "DELAYED", "ON_HOLD"] } },
    select: { id: true, title: true, budget: true, projectManagerId: true, teamLeaderId: true }
  });
}

async function dailyReportGeneration(date = new Date()) {
  const reportDate = dateOnly(date);
  const projects = await activeProjects();
  let generatedReports = 0;

  for (const project of projects) {
    const updates = await prisma.taskUpdate.findMany({
      where: { projectId: project.id, updateDate: reportDate },
      include: { task: { select: { title: true } } }
    });
    const grouped = new Map<string, typeof updates>();

    for (const update of updates) {
      const current = grouped.get(update.developerId) ?? [];
      current.push(update);
      grouped.set(update.developerId, current);
    }

    for (const [developerId, developerUpdates] of grouped.entries()) {
      const generatedSummary = developerUpdates
        .map((update) => `${update.task.title}: ${update.workDoneToday} (${update.currentStatus}, ${Number(update.progressPercentage)}%)`)
        .join("\n");
      const blockersSummary = developerUpdates.map((update) => update.blockers?.trim()).filter(Boolean).join("\n");
      const tomorrowPlanSummary = developerUpdates.map((update) => update.planForTomorrow?.trim()).filter(Boolean).join("\n");
      const totalHoursSpent = developerUpdates.reduce((sum, update) => sum + Number(update.timeSpent), 0);

      await prisma.dailyReport.upsert({
        where: { developerId_projectId_reportDate: { developerId, projectId: project.id, reportDate } },
        update: { generatedSummary, totalTasksUpdated: developerUpdates.length, totalHoursSpent, blockersSummary, tomorrowPlanSummary, generatedAt: new Date() },
        create: { developerId, projectId: project.id, reportDate, generatedSummary, totalTasksUpdated: developerUpdates.length, totalHoursSpent, blockersSummary, tomorrowPlanSummary }
      });
      generatedReports += 1;
    }
  }

  return { projectsChecked: projects.length, generatedReports };
}

async function deadlineReminders(date = new Date()) {
  const today = dateOnly(date);
  const soon = addDays(today, 2);
  const tasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      dueDate: { gte: today, lte: soon },
      status: { notIn: ["COMPLETED", "HOLD"] },
      assignedDeveloperId: { not: null }
    },
    include: { project: { select: { title: true } } }
  });
  let notificationsCreated = 0;

  for (const task of tasks) {
    if (!task.assignedDeveloperId) continue;
    const created = await createNotificationOnce({
      userId: task.assignedDeveloperId,
      type: "SYSTEM",
      title: "Task deadline reminder",
      message: `${task.title} is due on ${task.dueDate?.toISOString().slice(0, 10)}.`,
      entityType: "Task",
      entityId: task.id,
      metadata: { projectId: task.projectId, projectTitle: task.project.title },
      since: today
    });
    if (created) notificationsCreated += 1;
  }

  return { tasksChecked: tasks.length, notificationsCreated };
}

async function overdueTaskDetection(date = new Date()) {
  const today = dateOnly(date);
  const tasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      dueDate: { lt: today },
      status: { notIn: ["COMPLETED", "BLOCKED", "HOLD"] }
    },
    include: { project: { select: { projectManagerId: true, teamLeaderId: true, title: true } } }
  });
  let updatedTasks = 0;
  let notificationsCreated = 0;

  for (const task of tasks) {
    await prisma.task.update({ where: { id: task.id }, data: { status: "BLOCKED" } });
    updatedTasks += 1;

    for (const userId of [task.assignedDeveloperId, task.project.projectManagerId, task.project.teamLeaderId].filter((value): value is string => Boolean(value))) {
      const created = await createNotificationOnce({
        userId,
        type: "TASK_BLOCKED",
        title: "Task overdue",
        message: `${task.title} is overdue and has been marked blocked.`,
        entityType: "Task",
        entityId: task.id,
        metadata: { projectId: task.projectId, projectTitle: task.project.title },
        since: today
      });
      if (created) notificationsCreated += 1;
    }
  }

  return { tasksChecked: tasks.length, updatedTasks, notificationsCreated };
}

async function delayedMilestoneDetection(date = new Date()) {
  const today = dateOnly(date);
  const milestones = await prisma.milestone.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      dueDate: { lt: today },
      status: { notIn: ["COMPLETED", "DELAYED", "HOLD"] }
    },
    include: { project: { select: { projectManagerId: true, teamLeaderId: true, title: true } } }
  });
  let updatedMilestones = 0;
  let notificationsCreated = 0;

  for (const milestone of milestones) {
    await prisma.milestone.update({ where: { id: milestone.id }, data: { status: "DELAYED" } });
    updatedMilestones += 1;

    for (const userId of [milestone.responsibleUserId, milestone.project.projectManagerId, milestone.project.teamLeaderId].filter((value): value is string => Boolean(value))) {
      const created = await createNotificationOnce({
        userId,
        type: "MILESTONE_DUE",
        title: "Milestone delayed",
        message: `${milestone.title} is past due and has been marked delayed.`,
        entityType: "Milestone",
        entityId: milestone.id,
        metadata: { projectId: milestone.projectId, projectTitle: milestone.project.title },
        since: today
      });
      if (created) notificationsCreated += 1;
    }
  }

  return { milestonesChecked: milestones.length, updatedMilestones, notificationsCreated };
}

async function budgetThresholdAlerts(date = new Date()) {
  const today = dateOnly(date);
  const projects = await activeProjects();
  let alertsCreated = 0;

  for (const project of projects) {
    const budget = Number(project.budget);
    if (budget <= 0) continue;

    const logs = await prisma.taskTimeLog.findMany({
      where: { projectId: project.id },
      select: { developerId: true, workDate: true, hoursWorked: true }
    });
    let actualCost = 0;

    for (const log of logs) {
      const rate = await prisma.developerRate.findFirst({
        where: {
          developerId: log.developerId,
          effectiveFrom: { lte: log.workDate },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: log.workDate } }],
          deletedAt: null,
          isActive: true
        },
        orderBy: { effectiveFrom: "desc" }
      });
      actualCost += Number(log.hoursWorked) * Number(rate?.costPerHour ?? 0);
    }

    const utilization = (actualCost / budget) * 100;
    if (utilization < 80) continue;

    for (const userId of [project.projectManagerId, project.teamLeaderId].filter((value): value is string => Boolean(value))) {
      const created = await createNotificationOnce({
        userId,
        type: "SYSTEM",
        title: "Budget threshold alert",
        message: `${project.title} has reached ${Math.round(utilization)}% budget utilization.`,
        entityType: "Project",
        entityId: project.id,
        metadata: { actualCost: Math.round(actualCost * 100) / 100, budget, utilization: Math.round(utilization * 100) / 100 },
        since: today
      });
      if (created) alertsCreated += 1;
    }
  }

  return { projectsChecked: projects.length, alertsCreated };
}

async function dailySummary(date = new Date()) {
  const today = dateOnly(date);
  const projects = await activeProjects();
  let notificationsCreated = 0;

  for (const project of projects) {
    const [updates, blockers] = await Promise.all([
      prisma.taskUpdate.count({ where: { projectId: project.id, updateDate: today } }),
      prisma.taskBlocker.count({ where: { isResolved: false, deletedAt: null, task: { projectId: project.id } } })
    ]);

    for (const userId of [project.projectManagerId, project.teamLeaderId].filter((value): value is string => Boolean(value))) {
      const created = await createNotificationOnce({
        userId,
        type: "DAILY_REPORT",
        title: "Daily project summary",
        message: `${project.title}: ${updates} updates today, ${blockers} open blockers.`,
        entityType: "Project",
        entityId: project.id,
        metadata: { updates, blockers, reportDate: today.toISOString().slice(0, 10) },
        since: today
      });
      if (created) notificationsCreated += 1;
    }
  }

  return { projectsChecked: projects.length, notificationsCreated };
}

async function weeklySummary(date = new Date()) {
  const today = dateOnly(date);
  const start = addDays(today, -6);
  const projects = await activeProjects();
  let notificationsCreated = 0;

  for (const project of projects) {
    const [updates, completedTasks] = await Promise.all([
      prisma.taskUpdate.count({ where: { projectId: project.id, updateDate: { gte: start, lte: today } } }),
      prisma.task.count({ where: { projectId: project.id, completedDate: { gte: start, lte: today }, deletedAt: null } })
    ]);

    for (const userId of [project.projectManagerId, project.teamLeaderId].filter((value): value is string => Boolean(value))) {
      const created = await createNotificationOnce({
        userId,
        type: "DAILY_REPORT",
        title: "Weekly project summary",
        message: `${project.title}: ${updates} updates and ${completedTasks} completed tasks in the last 7 days.`,
        entityType: "Project",
        entityId: project.id,
        metadata: { updates, completedTasks, startDate: start.toISOString().slice(0, 10), endDate: today.toISOString().slice(0, 10) },
        since: today
      });
      if (created) notificationsCreated += 1;
    }
  }

  return { projectsChecked: projects.length, notificationsCreated };
}

const jobs: Record<JobName, (date?: Date) => Promise<Prisma.InputJsonValue>> = {
  "daily-report-generation": dailyReportGeneration,
  "deadline-reminders": deadlineReminders,
  "overdue-task-detection": overdueTaskDetection,
  "delayed-milestone-detection": delayedMilestoneDetection,
  "budget-threshold-alerts": budgetThresholdAlerts,
  "daily-summary": dailySummary,
  "weekly-summary": weeklySummary
};

export const backgroundJobService = {
  jobNames: Object.keys(jobs) as JobName[],

  listRuns() {
    return prisma.backgroundJobRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 100
    });
  },

  async runJob(jobName: JobName, date = new Date()) {
    const keyDate = jobName === "weekly-summary" ? weekKey(date) : runDateKey(date);
    const runKey = `${jobName}:${keyDate}`;
    return withRunLog(jobName, runKey, () => jobs[jobName](date));
  },

  async runAll(date = new Date()) {
    const results: JobResult[] = [];
    for (const jobName of this.jobNames) {
      results.push(await this.runJob(jobName, date));
    }
    return results;
  }
};
