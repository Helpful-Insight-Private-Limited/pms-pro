import { prisma } from "../prisma/client.js";
import type { Prisma } from "../generated/prisma/index.js";
import type { AuthUser } from "../types/auth.js";

type ReportFilters = {
  projectId?: string;
  clientId?: string;
  developerId?: string;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
};

type RateSnapshot = {
  costPerHour: number;
  billingRatePerHour: number;
  currency: string;
};

function activeProjectWhere(user: AuthUser): Prisma.ProjectWhereInput {
  const base: Prisma.ProjectWhereInput = { deletedAt: null, isActive: true };

  if (user.roles.includes("admin")) return base;

  return {
    ...base,
    OR: [
      { projectManagerId: user.id },
      { teamLeaderId: user.id },
      {
        members: {
          some: {
            userId: user.id,
            deletedAt: null,
            isActive: true,
            releasedDate: null
          }
        }
      },
      { tasks: { some: { assignedDeveloperId: user.id, deletedAt: null, isActive: true } } }
    ]
  };
}

function projectWhere(user: AuthUser, filters: ReportFilters): Prisma.ProjectWhereInput {
  return {
    ...activeProjectWhere(user),
    ...(filters.projectId ? { id: filters.projectId } : {}),
    ...(filters.clientId ? { clientId: filters.clientId } : {}),
    ...(filters.status ? { status: filters.status as never } : {})
  };
}

function dateRange(field: "workDate" | "createdAt", filters: ReportFilters) {
  if (!filters.fromDate && !filters.toDate) return {};

  return {
    [field]: {
      ...(filters.fromDate ? { gte: filters.fromDate } : {}),
      ...(filters.toDate ? { lte: filters.toDate } : {})
    }
  };
}

function taskWhere(user: AuthUser, filters: ReportFilters): Prisma.TaskWhereInput {
  return {
    deletedAt: null,
    isActive: true,
    project: projectWhere(user, filters),
    ...(filters.developerId ? { assignedDeveloperId: filters.developerId } : {})
  };
}

async function getRateAtDate(developerId: string, workDate: Date): Promise<RateSnapshot> {
  const rate = await prisma.developerRate.findFirst({
    where: {
      developerId,
      deletedAt: null,
      isActive: true,
      effectiveFrom: { lte: workDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: workDate } }]
    },
    orderBy: { effectiveFrom: "desc" }
  });

  return {
    costPerHour: Number(rate?.costPerHour ?? 0),
    billingRatePerHour: Number(rate?.billingRatePerHour ?? 0),
    currency: rate?.currency ?? "USD"
  };
}

async function summarizeTimeLogs(filters: ReportFilters, user: AuthUser) {
  const logs = await prisma.taskTimeLog.findMany({
    where: {
      project: projectWhere(user, filters),
      ...(filters.developerId ? { developerId: filters.developerId } : {}),
      ...dateRange("workDate", filters)
    },
    include: {
      developer: { select: { id: true, firstName: true, lastName: true, email: true } },
      project: { select: { id: true, title: true, code: true, budget: true, currency: true } },
      task: { select: { id: true, title: true, estimatedHours: true, actualHours: true } }
    },
    orderBy: { workDate: "desc" }
  });

  const enriched = [];
  let hours = 0;
  let actualCost = 0;
  let billableAmount = 0;

  for (const log of logs) {
    const rate = await getRateAtDate(log.developerId, log.workDate);
    const hoursWorked = Number(log.hoursWorked);
    const cost = hoursWorked * rate.costPerHour;
    const billing = hoursWorked * rate.billingRatePerHour;

    hours += hoursWorked;
    actualCost += cost;
    billableAmount += billing;

    enriched.push({
      ...log,
      hoursWorked,
      rate,
      actualCost: cost,
      billableAmount: billing
    });
  }

  return { logs: enriched, totals: { hours, actualCost, billableAmount } };
}

async function currentRate(developerId: string) {
  return prisma.developerRate.findFirst({
    where: { developerId, deletedAt: null, isActive: true, isCurrent: true },
    orderBy: { effectiveFrom: "desc" }
  });
}

export const advancedReportService = {
  async getProjectReport(user: AuthUser, filters: ReportFilters) {
    const where = projectWhere(user, filters);
    const projects = await prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, code: true } },
        projectManager: { select: { id: true, firstName: true, lastName: true, email: true } },
        teamLeader: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { members: true, milestones: true, sprints: true, tasks: true } }
      },
      orderBy: { updatedAt: "desc" }
    });
    const timeSummary = await summarizeTimeLogs(filters, user);

    return {
      filters,
      totals: {
        projects: projects.length,
        budget: projects.reduce((sum, project) => sum + Number(project.budget), 0),
        loggedHours: timeSummary.totals.hours,
        actualCost: timeSummary.totals.actualCost
      },
      projects
    };
  },

  async getDeveloperReport(user: AuthUser, filters: ReportFilters) {
    const [logsSummary, tasks] = await Promise.all([
      summarizeTimeLogs(filters, user),
      prisma.task.findMany({
        where: taskWhere(user, filters),
        select: {
          id: true,
          assignedDeveloperId: true,
          status: true,
          estimatedHours: true,
          actualHours: true,
          progressPercentage: true
        }
      })
    ]);
    const developers = new Map<string, { developer: unknown; loggedHours: number; actualCost: number; billableAmount: number; taskCount: number; completedTasks: number; estimatedHours: number; actualHours: number }>();

    for (const log of logsSummary.logs) {
      const item = developers.get(log.developerId) ?? {
        developer: log.developer,
        loggedHours: 0,
        actualCost: 0,
        billableAmount: 0,
        taskCount: 0,
        completedTasks: 0,
        estimatedHours: 0,
        actualHours: 0
      };
      item.loggedHours += log.hoursWorked;
      item.actualCost += log.actualCost;
      item.billableAmount += log.billableAmount;
      developers.set(log.developerId, item);
    }

    for (const task of tasks) {
      if (!task.assignedDeveloperId) continue;
      const item = developers.get(task.assignedDeveloperId) ?? {
        developer: await prisma.user.findUnique({
          where: { id: task.assignedDeveloperId },
          select: { id: true, firstName: true, lastName: true, email: true }
        }),
        loggedHours: 0,
        actualCost: 0,
        billableAmount: 0,
        taskCount: 0,
        completedTasks: 0,
        estimatedHours: 0,
        actualHours: 0
      };
      item.taskCount += 1;
      item.completedTasks += task.status === "COMPLETED" ? 1 : 0;
      item.estimatedHours += Number(task.estimatedHours);
      item.actualHours += Number(task.actualHours);
      developers.set(task.assignedDeveloperId, item);
    }

    return {
      filters,
      totals: logsSummary.totals,
      developers: [...developers.values()]
    };
  },

  async getTeamReport(user: AuthUser, filters: ReportFilters) {
    const members = await prisma.projectMember.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        project: projectWhere(user, filters),
        ...(filters.developerId ? { userId: filters.developerId } : {})
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, title: true, code: true, status: true } }
      },
      orderBy: { assignedDate: "desc" }
    });

    return {
      filters,
      totals: {
        members: members.length,
        allocationPercentage: members.reduce((sum, member) => sum + Number(member.allocationPercentage), 0)
      },
      members
    };
  },

  async getCostingReport(user: AuthUser, filters: ReportFilters) {
    const projects = await prisma.project.findMany({
      where: projectWhere(user, filters),
      select: { id: true, title: true, code: true, budget: true, currency: true }
    });
    const timeSummary = await summarizeTimeLogs(filters, user);
    const byProject = new Map(projects.map((project) => [project.id, {
      project,
      loggedHours: 0,
      actualCost: 0,
      billableAmount: 0,
      budget: Number(project.budget),
      remainingBudget: Number(project.budget),
      isOverBudget: false
    }]));

    for (const log of timeSummary.logs) {
      const item = byProject.get(log.projectId);
      if (!item) continue;
      item.loggedHours += log.hoursWorked;
      item.actualCost += log.actualCost;
      item.billableAmount += log.billableAmount;
      item.remainingBudget = item.budget - item.actualCost;
      item.isOverBudget = item.actualCost > item.budget;
    }

    return {
      filters,
      totals: timeSummary.totals,
      projects: [...byProject.values()]
    };
  },

  async getEstimatedVsActualReport(user: AuthUser, filters: ReportFilters) {
    const tasks = await prisma.task.findMany({
      where: taskWhere(user, filters),
      include: {
        project: { select: { id: true, title: true, code: true } },
        assignedDeveloper: { select: { id: true, firstName: true, lastName: true, email: true } }
      },
      orderBy: { updatedAt: "desc" }
    });

    return {
      filters,
      totals: {
        tasks: tasks.length,
        estimatedHours: tasks.reduce((sum, task) => sum + Number(task.estimatedHours), 0),
        actualHours: tasks.reduce((sum, task) => sum + Number(task.actualHours), 0)
      },
      tasks: await Promise.all(tasks.map(async (task) => {
        const rate = task.assignedDeveloperId ? await currentRate(task.assignedDeveloperId) : null;
        const estimatedCost = Number(task.estimatedHours) * Number(rate?.costPerHour ?? 0);
        const actualCost = Number(task.actualHours) * Number(rate?.costPerHour ?? 0);

        return {
          id: task.id,
          title: task.title,
          status: task.status,
          project: task.project,
          assignedDeveloper: task.assignedDeveloper,
          estimatedHours: Number(task.estimatedHours),
          actualHours: Number(task.actualHours),
          varianceHours: Number(task.actualHours) - Number(task.estimatedHours),
          estimatedCost,
          actualCost,
          varianceCost: actualCost - estimatedCost
        };
      }))
    };
  },

  async getBudgetOverrunReport(user: AuthUser, filters: ReportFilters) {
    const costing = await this.getCostingReport(user, filters);

    return {
      filters,
      totals: {
        projects: costing.projects.length,
        overBudgetProjects: costing.projects.filter((project) => project.isOverBudget).length,
        actualCost: costing.totals.actualCost
      },
      projects: costing.projects.filter((project) => project.isOverBudget)
    };
  }
};
