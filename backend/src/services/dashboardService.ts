import { prisma } from "../prisma/client.js";
import type { Prisma } from "../generated/prisma/index.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";

function today() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(input: Date, days: number) {
  const date = new Date(input);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function requireRole(user: AuthUser, roles: string[]) {
  if (user.roles.includes("admin")) return;
  if (!roles.some((role) => user.roles.includes(role))) {
    throw new ApiError(403, "FORBIDDEN", "Dashboard is not available for this role");
  }
}

function canViewBudget(user: AuthUser) {
  return user.roles.includes("admin") || user.permissions.includes("project.viewBudget") || user.permissions.includes("project.viewCosting") || user.permissions.includes("costing.view");
}

function accessibleProjectWhere(user: AuthUser): Prisma.ProjectWhereInput {
  if (user.roles.includes("admin")) {
    return { deletedAt: null, isActive: true };
  }

  return {
    deletedAt: null,
    isActive: true,
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
      }
    ]
  };
}

function managedProjectWhere(user: AuthUser): Prisma.ProjectWhereInput {
  return user.roles.includes("admin")
    ? { deletedAt: null, isActive: true }
    : { deletedAt: null, isActive: true, projectManagerId: user.id };
}

function ledProjectWhere(user: AuthUser): Prisma.ProjectWhereInput {
  return user.roles.includes("admin")
    ? { deletedAt: null, isActive: true }
    : { deletedAt: null, isActive: true, teamLeaderId: user.id };
}

function memberProjectWhere(user: AuthUser): Prisma.ProjectWhereInput {
  return {
    deletedAt: null,
    isActive: true,
    OR: [
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

function taskWhereForProjects(projectWhere: Prisma.ProjectWhereInput): Prisma.TaskWhereInput {
  return {
    deletedAt: null,
    isActive: true,
    project: projectWhere
  };
}

async function countProjectsByStatus(projectWhere: Prisma.ProjectWhereInput) {
  const grouped = await prisma.project.groupBy({
    by: ["status"],
    where: projectWhere,
    _count: { _all: true }
  });

  return Object.fromEntries(grouped.map((item) => [item.status, item._count._all]));
}

async function countTasksByStatus(taskWhere: Prisma.TaskWhereInput) {
  const grouped = await prisma.task.groupBy({
    by: ["status"],
    where: taskWhere,
    _count: { _all: true }
  });

  return Object.fromEntries(grouped.map((item) => [item.status, item._count._all]));
}

async function projectFinancialSummary(projectWhere: Prisma.ProjectWhereInput) {
  const projects = await prisma.project.findMany({
    where: projectWhere,
    select: { id: true, budget: true }
  });
  const projectIds = projects.map((project) => project.id);
  const timeSummary = projectIds.length === 0
    ? { _sum: { hoursWorked: null } }
    : await prisma.taskTimeLog.aggregate({
        where: { projectId: { in: projectIds } },
        _sum: { hoursWorked: true }
      });
  const taskSummary = await prisma.task.aggregate({
    where: taskWhereForProjects(projectWhere),
    _sum: { estimatedHours: true, actualHours: true }
  });

  return {
    totalBudget: projects.reduce((sum, project) => sum + Number(project.budget), 0),
    totalLoggedHours: Number(timeSummary._sum.hoursWorked ?? 0),
    totalEstimatedHours: Number(taskSummary._sum.estimatedHours ?? 0),
    totalActualHours: Number(taskSummary._sum.actualHours ?? 0)
  };
}

async function recentProjects(projectWhere: Prisma.ProjectWhereInput) {
  return prisma.project.findMany({
    where: projectWhere,
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      code: true,
      status: true,
      budget: true,
      currency: true,
      updatedAt: true,
      client: { select: { id: true, name: true } }
    }
  });
}

async function upcomingTasks(taskWhere: Prisma.TaskWhereInput) {
  const start = today();
  return prisma.task.findMany({
    where: {
      ...taskWhere,
      dueDate: { gte: start, lte: addDays(start, 7) },
      status: { notIn: ["COMPLETED", "HOLD"] }
    },
    orderBy: { dueDate: "asc" },
    take: 10,
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      project: { select: { id: true, title: true, code: true } },
      assignedDeveloper: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  });
}

async function dashboardBase(user: AuthUser, projectWhere: Prisma.ProjectWhereInput) {
  const taskWhere = taskWhereForProjects(projectWhere);
  const start = today();

  const [
    totalProjects,
    projectStatus,
    totalTasks,
    taskStatus,
    overdueTasks,
    openBlockers,
    financial,
    recentProjectItems,
    upcomingTaskItems,
    unreadNotifications
  ] = await Promise.all([
    prisma.project.count({ where: projectWhere }),
    countProjectsByStatus(projectWhere),
    prisma.task.count({ where: taskWhere }),
    countTasksByStatus(taskWhere),
    prisma.task.count({
      where: {
        ...taskWhere,
        dueDate: { lt: start },
        status: { notIn: ["COMPLETED", "HOLD"] }
      }
    }),
    prisma.taskBlocker.count({
      where: {
        deletedAt: null,
        isResolved: false,
        task: taskWhere
      }
    }),
    projectFinancialSummary(projectWhere),
    recentProjects(projectWhere),
    upcomingTasks(taskWhere),
    prisma.userNotification.count({ where: { userId: user.id, status: "UNREAD", deletedAt: null } })
  ]);

  const budgetVisible = canViewBudget(user);

  return {
    totals: {
      projects: totalProjects,
      tasks: totalTasks,
      overdueTasks,
      openBlockers,
      unreadNotifications
    },
    projectStatus,
    taskStatus,
    financial: budgetVisible
      ? financial
      : {
          ...financial,
          totalBudget: 0
        },
    recentProjects: budgetVisible
      ? recentProjectItems
      : recentProjectItems.map((project) => ({
          ...project,
          budget: undefined,
          currency: undefined,
          client: undefined
        })),
    upcomingTasks: upcomingTaskItems
  };
}

export const dashboardService = {
  async getAdminDashboard(user: AuthUser) {
    requireRole(user, ["admin"]);
    const projectWhere = { deletedAt: null, isActive: true } satisfies Prisma.ProjectWhereInput;
    const base = await dashboardBase(user, projectWhere);
    const [users, clients, failedJobs, latestJobRuns] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null, isActive: true } }),
      prisma.client.count({ where: { deletedAt: null, isActive: true } }),
      prisma.backgroundJobRun.count({ where: { status: "FAILED" } }),
      prisma.backgroundJobRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 5,
        select: { id: true, jobName: true, runKey: true, status: true, startedAt: true, finishedAt: true, errorMessage: true }
      })
    ]);

    return {
      role: "admin",
      ...base,
      totals: {
        ...base.totals,
        users,
        clients,
        failedJobs
      },
      latestJobRuns
    };
  },

  async getProjectManagerDashboard(user: AuthUser) {
    requireRole(user, ["projectManager"]);
    const projectWhere = managedProjectWhere(user);
    const base = await dashboardBase(user, projectWhere);
    const teamMembers = await prisma.projectMember.count({
      where: {
        deletedAt: null,
        isActive: true,
        releasedDate: null,
        project: projectWhere
      }
    });

    return {
      role: "projectManager",
      ...base,
      totals: {
        ...base.totals,
        teamMembers
      }
    };
  },

  async getTeamLeaderDashboard(user: AuthUser) {
    requireRole(user, ["teamLeader"]);
    const projectWhere = ledProjectWhere(user);
    const base = await dashboardBase(user, projectWhere);
    const [activeSprints, reviewTasks] = await Promise.all([
      prisma.sprint.count({ where: { deletedAt: null, isActive: true, status: "ACTIVE", project: projectWhere } }),
      prisma.task.count({ where: { ...taskWhereForProjects(projectWhere), status: "REVIEW" } })
    ]);

    return {
      role: "teamLeader",
      ...base,
      totals: {
        ...base.totals,
        activeSprints,
        reviewTasks
      }
    };
  },

  async getTeamMemberDashboard(user: AuthUser) {
    requireRole(user, ["teamMember"]);
    const projectWhere = memberProjectWhere(user);
    const taskWhere = {
      ...taskWhereForProjects(projectWhere),
      assignedDeveloperId: user.id
    } satisfies Prisma.TaskWhereInput;
    const base = await dashboardBase(user, projectWhere);
    const start = today();
    const [myTasks, myTaskStatus, dueToday, timeThisWeek, reportedBlockers] = await Promise.all([
      prisma.task.count({ where: taskWhere }),
      countTasksByStatus(taskWhere),
      prisma.task.count({ where: { ...taskWhere, dueDate: start, status: { notIn: ["COMPLETED", "HOLD"] } } }),
      prisma.taskTimeLog.aggregate({
        where: { developerId: user.id, workDate: { gte: addDays(start, -6), lte: start } },
        _sum: { hoursWorked: true }
      }),
      prisma.taskBlocker.count({ where: { reportedBy: user.id, deletedAt: null, isResolved: false } })
    ]);

    return {
      role: "teamMember",
      ...base,
      totals: {
        ...base.totals,
        myTasks,
        dueToday,
        reportedBlockers,
        hoursLoggedThisWeek: Number(timeThisWeek._sum.hoursWorked ?? 0)
      },
      myTaskStatus
    };
  },

  async getMyDashboard(user: AuthUser) {
    if (user.roles.includes("admin")) return this.getAdminDashboard(user);
    if (user.roles.includes("projectManager")) return this.getProjectManagerDashboard(user);
    if (user.roles.includes("teamLeader")) return this.getTeamLeaderDashboard(user);
    return this.getTeamMemberDashboard(user);
  }
};
