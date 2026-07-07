import { prisma } from "../prisma/client.js";
import type { Prisma } from "../generated/prisma/index.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";
import { emailService } from "./emailService.js";

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

function personName(person?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null) {
  if (!person) return "-";
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || person.email || "-";
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
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
  },

  async sendProjectReportEmail(user: AuthUser, input: { projectId: string; toEmail?: string; subject?: string; message?: string }) {
    if (!emailService.isConfigured()) {
      throw new ApiError(400, "EMAIL_NOT_CONFIGURED", "Email service is disabled or SMTP is not configured");
    }

    const project = await prisma.project.findFirst({
      where: { id: input.projectId, ...activeProjectWhere(user) },
      include: {
        client: true,
        projectManager: { select: { id: true, firstName: true, lastName: true, email: true } },
        teamLeader: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: {
          where: { deletedAt: null, isActive: true, releasedDate: null },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
        },
        milestones: {
          where: { deletedAt: null },
          orderBy: { dueDate: "asc" },
          include: { sprints: { where: { deletedAt: null }, orderBy: { startDate: "asc" } } }
        },
        tasks: {
          where: { deletedAt: null },
          orderBy: [{ status: "asc" }, { dueDate: "asc" }],
          include: { assignedDeveloper: { select: { firstName: true, lastName: true, email: true } } }
        }
      }
    });

    if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found");
    if (!user.roles.includes("admin") && project.projectManagerId !== user.id) {
      throw new ApiError(403, "PROJECT_REPORT_EMAIL_FORBIDDEN", "Only admins and the project manager can send client report emails");
    }

    const toEmail = input.toEmail || project.client.contactEmail;
    if (!toEmail) throw new ApiError(400, "CLIENT_EMAIL_REQUIRED", "Client contact email is required");

    const timeLogs = await prisma.taskTimeLog.findMany({ where: { projectId: project.id } });
    const completedTasks = project.tasks.filter((task) => task.status === "COMPLETED");
    const pendingTasks = project.tasks.filter((task) => !["COMPLETED", "HOLD"].includes(task.status));
    const blockedTasks = project.tasks.filter((task) => task.status === "BLOCKED");
    const estimatedHours = project.tasks.reduce((sum, task) => sum + Number(task.estimatedHours), 0);
    const actualHours = project.tasks.reduce((sum, task) => sum + Number(task.actualHours), 0);
    const loggedHours = timeLogs.reduce((sum, log) => sum + Number(log.hoursWorked), 0);
    const remainingHours = Math.max(0, estimatedHours - actualHours);
    const subject = input.subject || `${project.code} - ${project.title} Project Status Report`;

    const taskRows = pendingTasks.slice(0, 20).map((task) => `
      <tr>
        <td>${escapeHtml(task.title)}</td>
        <td>${escapeHtml(task.status.replaceAll("_", " "))}</td>
        <td>${escapeHtml(task.priority)}</td>
        <td>${escapeHtml(personName(task.assignedDeveloper))}</td>
        <td>${escapeHtml(formatDate(task.dueDate))}</td>
        <td>${Number(task.progressPercentage).toFixed(0)}%</td>
      </tr>
    `).join("");

    const milestoneRows = project.milestones.map((milestone) => `
      <tr>
        <td>${escapeHtml(milestone.title)}</td>
        <td>${escapeHtml(milestone.status)}</td>
        <td>${escapeHtml(formatDate(milestone.startDate))}</td>
        <td>${escapeHtml(formatDate(milestone.dueDate))}</td>
        <td>${Number(milestone.progressPercentage).toFixed(0)}%</td>
      </tr>
    `).join("");

    const body = `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5">
        <h2 style="margin:0 0 4px">${escapeHtml(project.title)} Status Report</h2>
        <p style="margin:0 0 18px;color:#667085">${escapeHtml(project.code)} | ${escapeHtml(project.client.name)} | ${escapeHtml(formatDate(new Date()))}</p>
        ${input.message ? `<p style="padding:12px;background:#f8fafc;border:1px solid #d7dde8;border-radius:6px">${escapeHtml(input.message)}</p>` : ""}
        <table style="width:100%;border-collapse:collapse;margin:18px 0">
          <tr>
            <td style="padding:10px;border:1px solid #d7dde8"><strong>Progress</strong><br>${Number(project.progressPercentage).toFixed(0)}%</td>
            <td style="padding:10px;border:1px solid #d7dde8"><strong>Status</strong><br>${escapeHtml(project.status)}</td>
            <td style="padding:10px;border:1px solid #d7dde8"><strong>Completed Tasks</strong><br>${completedTasks.length}/${project.tasks.length}</td>
            <td style="padding:10px;border:1px solid #d7dde8"><strong>Remaining Hours</strong><br>${remainingHours.toFixed(2)}</td>
          </tr>
        </table>
        <p><strong>Project Manager:</strong> ${escapeHtml(personName(project.projectManager))}<br>
        <strong>Team Lead:</strong> ${escapeHtml(personName(project.teamLeader))}<br>
        <strong>Timeline:</strong> ${escapeHtml(formatDate(project.startDate))} to ${escapeHtml(formatDate(project.endDate))}<br>
        <strong>Logged Hours:</strong> ${loggedHours.toFixed(2)} | <strong>Estimated Hours:</strong> ${estimatedHours.toFixed(2)} | <strong>Actual Hours:</strong> ${actualHours.toFixed(2)}</p>
        <h3>Milestones</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr><th align="left">Milestone</th><th align="left">Status</th><th align="left">Start</th><th align="left">Due</th><th align="left">Progress</th></tr></thead>
          <tbody>${milestoneRows || `<tr><td colspan="5">No milestones added.</td></tr>`}</tbody>
        </table>
        <h3>Pending / Active Items</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr><th align="left">Task</th><th align="left">Status</th><th align="left">Priority</th><th align="left">Assignee</th><th align="left">Due</th><th align="left">Progress</th></tr></thead>
          <tbody>${taskRows || `<tr><td colspan="6">No pending tasks.</td></tr>`}</tbody>
        </table>
        <p style="margin-top:18px;color:#667085"><strong>Blocked items:</strong> ${blockedTasks.length}. <strong>Completed tasks:</strong> ${completedTasks.length}. <strong>Pending tasks:</strong> ${pendingTasks.length}.</p>
      </div>
    `;

    const emailLog = await emailService.queueAndSend({
      toEmail,
      subject,
      body
    });

    await prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: "report.projectEmailSent",
        module: "report",
        entityType: "Project",
        entityId: project.id,
        projectId: project.id,
        metadata: { toEmail, subject, emailLogId: emailLog.id, status: emailLog.status }
      }
    });

    return emailLog;
  }
};
