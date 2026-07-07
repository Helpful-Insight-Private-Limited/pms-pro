import { prisma } from "../prisma/client.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";
import { activityLogService } from "./activityLogService.js";

type CalendarQuery = Record<string, unknown>;

type EventInput = {
  title?: string;
  description?: string | null;
  type?: "PROJECT" | "MILESTONE" | "SPRINT" | "TASK" | "LEAVE" | "HOLIDAY" | "MEETING" | "OTHER";
  startAt?: Date;
  endAt?: Date;
  allDay?: boolean;
  projectId?: string | null;
  taskId?: string | null;
  isActive?: boolean;
};

type LeaveInput = {
  developerId?: string;
  type?: "FULL_DAY" | "HALF_DAY" | "SICK" | "CASUAL" | "VACATION" | "UNPAID";
  status?: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  startDate?: Date;
  endDate?: Date;
  reason?: string | null;
  approvalNote?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  isActive?: boolean;
};

type HolidayInput = {
  name?: string;
  holidayDate?: Date;
  region?: string | null;
  description?: string | null;
  isActive?: boolean;
};

function parseDate(value: unknown, fallback: Date) {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, "INVALID_DATE", "Date filter is invalid");
  return date;
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateKey(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function dateRange(query: CalendarQuery) {
  const now = new Date();
  const defaultStart = startOfDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const defaultEnd = endOfDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)));
  const fromDate = startOfDay(parseDate(query.fromDate ?? query.startDate, defaultStart));
  const toDate = endOfDay(parseDate(query.toDate ?? query.endDate, defaultEnd));

  if (fromDate > toDate) {
    throw new ApiError(400, "INVALID_DATE_RANGE", "fromDate must be before or equal to toDate");
  }

  return { fromDate, toDate };
}

function canManagePeople(user: AuthUser) {
  return user.roles.includes("admin") || user.roles.includes("projectManager") || user.roles.includes("teamLeader");
}

function isAdmin(user: AuthUser) {
  return user.roles.includes("admin");
}

function isProjectManager(user: AuthUser) {
  return user.roles.includes("projectManager");
}

function isTeamLeader(user: AuthUser) {
  return user.roles.includes("teamLeader");
}

function isWeekend(date: Date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function daysBetween(startDate: Date, endDate: Date) {
  const days: Date[] = [];
  for (let current = startOfDay(startDate); current <= endOfDay(endDate); current = addDays(current, 1)) {
    days.push(current);
  }
  return days;
}

function isHalfDayLeave(type: string) {
  return type === "HALF_DAY";
}

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

function formatUser(user: { id: string; firstName: string; lastName: string | null; email: string }) {
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName ?? ""}`.trim(),
    email: user.email
  };
}

async function assertActiveUser(userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null, isActive: true } });
  if (!user) throw new ApiError(400, "INVALID_DEVELOPER", "Developer is not an active user");
}

async function userRoleSlugs(userId: string) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId, isActive: true, revokedAt: null, role: { deletedAt: null, isActive: true } },
    select: { role: { select: { slug: true } } }
  });

  return userRoles.map((item) => item.role.slug);
}

async function managedDeveloperIds(user: AuthUser) {
  if (isAdmin(user)) return undefined;

  const ids = new Set<string>([user.id]);

  if (isProjectManager(user)) {
    const projects = await prisma.project.findMany({
      where: { projectManagerId: user.id, deletedAt: null, isActive: true },
      select: {
        teamLeaderId: true,
        members: { where: { deletedAt: null, isActive: true }, select: { userId: true } }
      }
    });
    for (const project of projects) {
      if (project.teamLeaderId) ids.add(project.teamLeaderId);
      for (const member of project.members) ids.add(member.userId);
    }
  }

  if (isTeamLeader(user)) {
    const projects = await prisma.project.findMany({
      where: { teamLeaderId: user.id, deletedAt: null, isActive: true },
      select: { members: { where: { deletedAt: null, isActive: true }, select: { userId: true } } }
    });
    for (const project of projects) {
      for (const member of project.members) ids.add(member.userId);
    }
  }

  return [...ids];
}

async function leaveHierarchy(developerId: string) {
  const roles = await userRoleSlugs(developerId);
  const developerIsPm = roles.includes("projectManager");
  const developerIsTl = roles.includes("teamLeader");
  const projectAsLeader = await prisma.project.findFirst({
    where: { teamLeaderId: developerId, deletedAt: null, isActive: true },
    select: { projectManagerId: true }
  });
  const projectAsMember = await prisma.project.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      members: { some: { userId: developerId, deletedAt: null, isActive: true } }
    },
    select: { teamLeaderId: true, projectManagerId: true }
  });

  if (developerIsPm) {
    return {
      role: "projectManager",
      teamLeaderRequired: false,
      projectManagerRequired: false,
      adminRequired: true,
      teamLeaderId: null,
      projectManagerId: null
    };
  }

  if (developerIsTl) {
    const projectManagerId = projectAsLeader?.projectManagerId ?? projectAsMember?.projectManagerId ?? null;
    return {
      role: "teamLeader",
      teamLeaderRequired: false,
      projectManagerRequired: Boolean(projectManagerId),
      adminRequired: !projectManagerId,
      teamLeaderId: null,
      projectManagerId
    };
  }

  const teamLeaderId = projectAsMember?.teamLeaderId ?? null;
  const projectManagerId = projectAsMember?.projectManagerId ?? null;

  return {
    role: "teamMember",
    teamLeaderRequired: Boolean(teamLeaderId),
    projectManagerRequired: Boolean(projectManagerId),
    adminRequired: !teamLeaderId || !projectManagerId,
    teamLeaderId,
    projectManagerId
  };
}

function finalLeaveStatus(input: {
  teamLeaderApprovalStatus: string;
  projectManagerApprovalStatus: string;
  adminApprovalStatus: string;
}) {
  const statuses = [input.teamLeaderApprovalStatus, input.projectManagerApprovalStatus, input.adminApprovalStatus].filter((status) => status !== "NOT_REQUIRED");
  if (statuses.includes("REJECTED")) return "REJECTED";
  if (statuses.length > 0 && statuses.every((status) => status === "APPROVED")) return "APPROVED";
  return "PENDING";
}

function eventShape(input: {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  startAt: Date;
  endAt: Date;
  allDay?: boolean;
  source: string;
  projectId?: string | null;
  taskId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return {
    id: input.id,
    title: input.title,
    description: input.description ?? null,
    type: input.type,
    startAt: input.startAt,
    endAt: input.endAt,
    allDay: input.allDay ?? true,
    source: input.source,
    projectId: input.projectId ?? null,
    taskId: input.taskId ?? null,
    metadata: input.metadata ?? {}
  };
}

export const calendarService = {
  async listEvents(query: CalendarQuery, _user: AuthUser) {
    const { fromDate, toDate } = dateRange(query);
    const projectId = typeof query.projectId === "string" ? query.projectId : undefined;
    const visibleDeveloperIds = await managedDeveloperIds(_user);

    const [customEvents, projects, milestones, sprints, tasks, leaves, holidays] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...(projectId ? { projectId } : {}),
          startAt: { lte: toDate },
          endAt: { gte: fromDate }
        },
        orderBy: { startAt: "asc" }
      }),
      prisma.project.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...(projectId ? { id: projectId } : {}),
          OR: [
            { startDate: { gte: fromDate, lte: toDate } },
            { endDate: { gte: fromDate, lte: toDate } },
            { startDate: { lte: fromDate }, endDate: { gte: toDate } }
          ]
        },
        select: { id: true, title: true, code: true, startDate: true, endDate: true, status: true }
      }),
      prisma.milestone.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...(projectId ? { projectId } : {}),
          OR: [
            { startDate: { gte: fromDate, lte: toDate } },
            { dueDate: { gte: fromDate, lte: toDate } },
            { startDate: { lte: fromDate }, dueDate: { gte: toDate } }
          ]
        },
        select: { id: true, projectId: true, title: true, startDate: true, dueDate: true, status: true }
      }),
      prisma.sprint.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...(projectId ? { projectId } : {}),
          OR: [
            { startDate: { gte: fromDate, lte: toDate } },
            { endDate: { gte: fromDate, lte: toDate } },
            { startDate: { lte: fromDate }, endDate: { gte: toDate } }
          ]
        },
        select: { id: true, projectId: true, name: true, startDate: true, endDate: true, status: true }
      }),
      prisma.task.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...(projectId ? { projectId } : {}),
          OR: [
            { startDate: { gte: fromDate, lte: toDate } },
            { dueDate: { gte: fromDate, lte: toDate } },
            { startDate: { lte: fromDate }, dueDate: { gte: toDate } }
          ]
        },
        select: { id: true, projectId: true, title: true, startDate: true, dueDate: true, status: true, assignedDeveloperId: true }
      }),
      prisma.developerLeave.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          status: "APPROVED",
          ...(visibleDeveloperIds ? { developerId: { in: visibleDeveloperIds } } : {}),
          startDate: { lte: toDate },
          endDate: { gte: fromDate }
        },
        include: { developer: { select: { id: true, firstName: true, lastName: true, email: true } } }
      }),
      prisma.holiday.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          holidayDate: { gte: fromDate, lte: toDate }
        },
        orderBy: { holidayDate: "asc" }
      })
    ]);

    return [
      ...customEvents.map((event) =>
        eventShape({
          ...event,
          source: "custom"
        })
      ),
      ...projects
        .filter((project) => project.startDate || project.endDate)
        .map((project) =>
          eventShape({
            id: `project:${project.id}`,
            title: project.title,
            description: project.code,
            type: "PROJECT",
            startAt: project.startDate ?? project.endDate!,
            endAt: project.endDate ?? project.startDate!,
            source: "project",
            projectId: project.id,
            metadata: { status: project.status }
          })
        ),
      ...milestones
        .filter((milestone) => milestone.startDate || milestone.dueDate)
        .map((milestone) =>
          eventShape({
            id: `milestone:${milestone.id}`,
            title: milestone.title,
            type: "MILESTONE",
            startAt: milestone.startDate ?? milestone.dueDate!,
            endAt: milestone.dueDate ?? milestone.startDate!,
            source: "milestone",
            projectId: milestone.projectId,
            metadata: { status: milestone.status }
          })
        ),
      ...sprints
        .filter((sprint) => sprint.startDate || sprint.endDate)
        .map((sprint) =>
          eventShape({
            id: `sprint:${sprint.id}`,
            title: sprint.name,
            type: "SPRINT",
            startAt: sprint.startDate ?? sprint.endDate!,
            endAt: sprint.endDate ?? sprint.startDate!,
            source: "sprint",
            projectId: sprint.projectId,
            metadata: { status: sprint.status }
          })
        ),
      ...tasks
        .filter((task) => task.startDate || task.dueDate)
        .map((task) =>
          eventShape({
            id: `task:${task.id}`,
            title: task.title,
            type: "TASK",
            startAt: task.startDate ?? task.dueDate!,
            endAt: task.dueDate ?? task.startDate!,
            source: "task",
            projectId: task.projectId,
            taskId: task.id,
            metadata: { status: task.status, assignedDeveloperId: task.assignedDeveloperId }
          })
        ),
      ...leaves.map((leave) =>
        eventShape({
          id: `leave:${leave.id}`,
          title: `${formatUser(leave.developer).name} leave`,
          description: leave.reason,
          type: "LEAVE",
          startAt: leave.startDate,
          endAt: leave.endDate,
          source: "leave",
          metadata: { leaveType: leave.type, status: leave.status, developer: formatUser(leave.developer) }
        })
      ),
      ...holidays.map((holiday) =>
        eventShape({
          id: `holiday:${holiday.id}`,
          title: holiday.name,
          description: holiday.description,
          type: "HOLIDAY",
          startAt: holiday.holidayDate,
          endAt: holiday.holidayDate,
          source: "holiday",
          metadata: { region: holiday.region }
        })
      )
    ].sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime());
  },

  async createEvent(input: Required<Pick<EventInput, "title" | "startAt" | "endAt">> & EventInput, user: AuthUser) {
    const event = await prisma.calendarEvent.create({
      data: {
        title: input.title,
        description: input.description,
        type: input.type ?? "OTHER",
        startAt: input.startAt,
        endAt: input.endAt,
        allDay: input.allDay ?? false,
        projectId: input.projectId,
        taskId: input.taskId,
        createdBy: user.id
      }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "calendar.eventCreated",
      module: "calendar",
      entityType: "CalendarEvent",
      entityId: event.id,
      projectId: event.projectId,
      taskId: event.taskId,
      metadata: { title: event.title, type: event.type }
    });

    return event;
  },

  async updateEvent(id: string, input: EventInput, user: AuthUser) {
    const existing = await prisma.calendarEvent.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new ApiError(404, "CALENDAR_EVENT_NOT_FOUND", "Calendar event not found");

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: { ...input, updatedBy: user.id }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "calendar.eventUpdated",
      module: "calendar",
      entityType: "CalendarEvent",
      entityId: event.id,
      projectId: event.projectId,
      taskId: event.taskId,
      metadata: { changedFields: Object.keys(input), title: event.title }
    });

    return event;
  },

  async deleteEvent(id: string, user: AuthUser) {
    const existing = await prisma.calendarEvent.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new ApiError(404, "CALENDAR_EVENT_NOT_FOUND", "Calendar event not found");

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: user.id }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "calendar.eventDeleted",
      module: "calendar",
      entityType: "CalendarEvent",
      entityId: event.id,
      projectId: event.projectId,
      taskId: event.taskId,
      metadata: { title: event.title }
    });

    return event;
  },

  async listLeaves(query: CalendarQuery, user: AuthUser) {
    const { fromDate, toDate } = dateRange(query);
    const requestedDeveloperId = typeof query.developerId === "string" ? query.developerId : undefined;
    const visibleDeveloperIds = await managedDeveloperIds(user);
    const developerId = requestedDeveloperId ?? (!canManagePeople(user) ? user.id : undefined);

    return prisma.developerLeave.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(visibleDeveloperIds ? { developerId: { in: visibleDeveloperIds } } : {}),
        ...(developerId ? { developerId } : {}),
        startDate: { lte: toDate },
        endDate: { gte: fromDate }
      },
      include: {
        developer: { select: { id: true, firstName: true, lastName: true, email: true } }
      },
      orderBy: [{ startDate: "asc" }, { createdAt: "desc" }]
    });
  },

  async createLeave(input: Required<Pick<LeaveInput, "startDate" | "endDate">> & LeaveInput, user: AuthUser) {
    const visibleDeveloperIds = await managedDeveloperIds(user);
    const developerId = canManagePeople(user) && input.developerId ? input.developerId : user.id;
    if (visibleDeveloperIds && !visibleDeveloperIds.includes(developerId)) {
      throw new ApiError(403, "FORBIDDEN", "You cannot request leave for this user");
    }
    await assertActiveUser(developerId);
    const hierarchy = await leaveHierarchy(developerId);
    const teamLeaderApprovalStatus = hierarchy.teamLeaderRequired ? "PENDING" : "NOT_REQUIRED";
    const projectManagerApprovalStatus = hierarchy.projectManagerRequired ? "PENDING" : "NOT_REQUIRED";
    const adminApprovalStatus = hierarchy.adminRequired ? "PENDING" : "NOT_REQUIRED";

    const leave = await prisma.developerLeave.create({
      data: {
        developerId,
        type: input.type ?? "FULL_DAY",
        status: "PENDING",
        startDate: input.startDate,
        endDate: input.endDate,
        reason: input.reason,
        teamLeaderApprovalStatus,
        projectManagerApprovalStatus,
        adminApprovalStatus,
        createdBy: user.id
      }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "calendar.leaveCreated",
      module: "calendar",
      entityType: "DeveloperLeave",
      entityId: leave.id,
      metadata: { developerId: leave.developerId, status: leave.status, type: leave.type }
    });

    return leave;
  },

  async updateLeave(id: string, input: LeaveInput, user: AuthUser) {
    const existing = await prisma.developerLeave.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new ApiError(404, "LEAVE_NOT_FOUND", "Leave request not found");

    const hierarchy = await leaveHierarchy(existing.developerId);
    const now = new Date();
    const requestedStatus = input.status;
    const approvalNote = input.approvalNote ?? null;

    if (existing.developerId === user.id && !requestedStatus) {
      if (existing.status !== "PENDING") {
        throw new ApiError(400, "LEAVE_LOCKED", "Only pending leave requests can be edited by the requester");
      }
      const leave = await prisma.developerLeave.update({
        where: { id },
        data: {
          type: input.type ?? existing.type,
          startDate: input.startDate ?? existing.startDate,
          endDate: input.endDate ?? existing.endDate,
          reason: input.reason,
          updatedBy: user.id
        }
      });

      await activityLogService.create({
        actorId: user.id,
        action: "calendar.leaveUpdated",
        module: "calendar",
        entityType: "DeveloperLeave",
        entityId: leave.id,
        metadata: { changedFields: Object.keys(input), status: leave.status }
      });
      return leave;
    }

    if (requestedStatus !== "APPROVED" && requestedStatus !== "REJECTED" && requestedStatus !== "CANCELLED") {
      throw new ApiError(403, "FORBIDDEN", "Only approval, rejection, or cancellation is allowed here");
    }

    if (requestedStatus === "CANCELLED") {
      if (existing.developerId !== user.id && !isAdmin(user)) throw new ApiError(403, "FORBIDDEN", "Only requester or admin can cancel leave");
      return prisma.developerLeave.update({
        where: { id },
        data: { status: "CANCELLED", updatedBy: user.id }
      });
    }

    const approvalData: Record<string, unknown> = {};

    if (isAdmin(user)) {
      if (hierarchy.adminRequired) {
        approvalData.adminApprovalStatus = requestedStatus;
        approvalData.adminApprovedBy = user.id;
        approvalData.adminApprovedAt = now;
        approvalData.adminApprovalNote = approvalNote;
      } else {
        if (existing.teamLeaderApprovalStatus === "PENDING") {
          approvalData.teamLeaderApprovalStatus = requestedStatus;
          approvalData.teamLeaderApprovedBy = user.id;
          approvalData.teamLeaderApprovedAt = now;
          approvalData.teamLeaderApprovalNote = approvalNote;
        }
        if (existing.projectManagerApprovalStatus === "PENDING") {
          approvalData.projectManagerApprovalStatus = requestedStatus;
          approvalData.projectManagerApprovedBy = user.id;
          approvalData.projectManagerApprovedAt = now;
          approvalData.projectManagerApprovalNote = approvalNote;
        }
      }
    } else if (isProjectManager(user) && hierarchy.projectManagerRequired && hierarchy.projectManagerId === user.id) {
      approvalData.projectManagerApprovalStatus = requestedStatus;
      approvalData.projectManagerApprovedBy = user.id;
      approvalData.projectManagerApprovedAt = now;
      approvalData.projectManagerApprovalNote = approvalNote;
    } else if (isTeamLeader(user) && hierarchy.teamLeaderRequired && hierarchy.teamLeaderId === user.id) {
      approvalData.teamLeaderApprovalStatus = requestedStatus;
      approvalData.teamLeaderApprovedBy = user.id;
      approvalData.teamLeaderApprovedAt = now;
      approvalData.teamLeaderApprovalNote = approvalNote;
    } else {
      throw new ApiError(403, "FORBIDDEN", "You are not an approver for this leave request");
    }

    const nextApprovalState = {
      teamLeaderApprovalStatus: String(approvalData.teamLeaderApprovalStatus ?? existing.teamLeaderApprovalStatus),
      projectManagerApprovalStatus: String(approvalData.projectManagerApprovalStatus ?? existing.projectManagerApprovalStatus),
      adminApprovalStatus: String(approvalData.adminApprovalStatus ?? existing.adminApprovalStatus)
    };
    const nextStatus = finalLeaveStatus(nextApprovalState);
    const leave = await prisma.developerLeave.update({
      where: { id },
      data: {
        ...approvalData,
        status: nextStatus,
        approvedBy: nextStatus === "APPROVED" ? user.id : null,
        approvedAt: nextStatus === "APPROVED" ? now : null,
        updatedBy: user.id
      }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "calendar.leaveUpdated",
      module: "calendar",
      entityType: "DeveloperLeave",
      entityId: leave.id,
      metadata: { changedFields: Object.keys(input), status: leave.status }
    });

    return leave;
  },

  async deleteLeave(id: string, user: AuthUser) {
    const existing = await prisma.developerLeave.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new ApiError(404, "LEAVE_NOT_FOUND", "Leave request not found");

    if (!isAdmin(user) && existing.developerId !== user.id) {
      throw new ApiError(403, "FORBIDDEN", "You can only delete your own leave request");
    }

    const leave = await prisma.developerLeave.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: user.id }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "calendar.leaveDeleted",
      module: "calendar",
      entityType: "DeveloperLeave",
      entityId: leave.id,
      metadata: { developerId: leave.developerId }
    });

    return leave;
  },

  async listHolidays(query: CalendarQuery) {
    const { fromDate, toDate } = dateRange(query);
    return prisma.holiday.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        holidayDate: { gte: fromDate, lte: toDate }
      },
      orderBy: [{ holidayDate: "asc" }, { name: "asc" }]
    });
  },

  async createHoliday(input: Required<Pick<HolidayInput, "name" | "holidayDate">> & HolidayInput, user: AuthUser) {
    const holiday = await prisma.holiday.create({
      data: {
        name: input.name,
        holidayDate: input.holidayDate,
        region: input.region,
        description: input.description,
        createdBy: user.id
      }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "calendar.holidayCreated",
      module: "calendar",
      entityType: "Holiday",
      entityId: holiday.id,
      metadata: { name: holiday.name, holidayDate: holiday.holidayDate }
    });

    return holiday;
  },

  async updateHoliday(id: string, input: HolidayInput, user: AuthUser) {
    const existing = await prisma.holiday.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new ApiError(404, "HOLIDAY_NOT_FOUND", "Holiday not found");

    const holiday = await prisma.holiday.update({
      where: { id },
      data: { ...input, updatedBy: user.id }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "calendar.holidayUpdated",
      module: "calendar",
      entityType: "Holiday",
      entityId: holiday.id,
      metadata: { changedFields: Object.keys(input), name: holiday.name }
    });

    return holiday;
  },

  async deleteHoliday(id: string, user: AuthUser) {
    const existing = await prisma.holiday.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new ApiError(404, "HOLIDAY_NOT_FOUND", "Holiday not found");

    const holiday = await prisma.holiday.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: user.id }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "calendar.holidayDeleted",
      module: "calendar",
      entityType: "Holiday",
      entityId: holiday.id,
      metadata: { name: holiday.name }
    });

    return holiday;
  },

  async getAvailability(query: CalendarQuery, user: AuthUser) {
    const { fromDate, toDate } = dateRange(query);
    const requestedDeveloperId = typeof query.developerId === "string" ? query.developerId : undefined;
    const visibleDeveloperIds = await managedDeveloperIds(user);
    const developerId = requestedDeveloperId ?? (!canManagePeople(user) ? user.id : undefined);

    const [developers, leaves, holidays] = await Promise.all([
      prisma.user.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...(visibleDeveloperIds ? { id: { in: visibleDeveloperIds } } : {}),
          ...(developerId ? { id: developerId } : {}),
          developerProfile: { is: { deletedAt: null, isActive: true } }
        },
        include: {
          developerProfile: true
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
      }),
      prisma.developerLeave.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          status: "APPROVED",
          ...(visibleDeveloperIds ? { developerId: { in: visibleDeveloperIds } } : {}),
          ...(developerId ? { developerId } : {}),
          startDate: { lte: toDate },
          endDate: { gte: fromDate }
        }
      }),
      prisma.holiday.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          holidayDate: { gte: fromDate, lte: toDate }
        }
      })
    ]);

    const holidayKeys = new Set(holidays.map((holiday) => dateKey(holiday.holidayDate)));
    const rangeDays = daysBetween(fromDate, toDate);

    return developers.map((developer) => {
      const dailyHours = toNumber(developer.developerProfile?.availableHoursPerDay ?? 8);
      const developerLeaves = leaves.filter((leave) => leave.developerId === developer.id);
      let workingDays = 0;
      let holidayDays = 0;
      let leaveDays = 0;
      let availableHours = 0;

      for (const day of rangeDays) {
        if (isWeekend(day)) continue;
        if (holidayKeys.has(dateKey(day))) {
          holidayDays += 1;
          continue;
        }

        workingDays += 1;
        const leaveForDay = developerLeaves.find((leave) => startOfDay(leave.startDate) <= day && startOfDay(leave.endDate) >= day);
        if (leaveForDay) {
          const deduction = isHalfDayLeave(leaveForDay.type) ? dailyHours / 2 : dailyHours;
          leaveDays += isHalfDayLeave(leaveForDay.type) ? 0.5 : 1;
          availableHours += Math.max(0, dailyHours - deduction);
        } else {
          availableHours += dailyHours;
        }
      }

      return {
        developer: formatUser(developer),
        designation: developer.developerProfile?.designation ?? null,
        dailyHours,
        workingDays,
        holidayDays,
        leaveDays,
        availableHours
      };
    });
  },

  async getWorkload(query: CalendarQuery, user: AuthUser) {
    const { fromDate, toDate } = dateRange(query);
    const availability = await this.getAvailability(query, user);
    const developerIds = availability.map((item) => item.developer.id);

    const [tasks, memberships] = await Promise.all([
      prisma.task.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          assignedDeveloperId: { in: developerIds },
          status: { notIn: ["COMPLETED", "HOLD"] },
          OR: [
            { startDate: { gte: fromDate, lte: toDate } },
            { dueDate: { gte: fromDate, lte: toDate } },
            { startDate: { lte: fromDate }, dueDate: { gte: toDate } }
          ]
        },
        select: {
          id: true,
          title: true,
          assignedDeveloperId: true,
          estimatedHours: true,
          actualHours: true,
          status: true,
          priority: true,
          project: { select: { id: true, title: true } }
        }
      }),
      prisma.projectMember.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          userId: { in: developerIds },
          assignedDate: { lte: toDate },
          OR: [{ releasedDate: null }, { releasedDate: { gte: fromDate } }]
        },
        include: { project: { select: { id: true, title: true, status: true } } }
      })
    ]);

    return availability.map((item) => {
      const developerTasks = tasks.filter((task) => task.assignedDeveloperId === item.developer.id);
      const assignedEstimatedHours = developerTasks.reduce((total, task) => total + toNumber(task.estimatedHours), 0);
      const actualHours = developerTasks.reduce((total, task) => total + toNumber(task.actualHours), 0);
      const allocations = memberships
        .filter((member) => member.userId === item.developer.id)
        .map((member) => ({
          project: member.project,
          roleInProject: member.roleInProject,
          allocationPercentage: toNumber(member.allocationPercentage)
        }));
      const allocatedByMembershipHours = allocations.reduce((total, member) => total + item.availableHours * (member.allocationPercentage / 100), 0);
      const loadHours = Math.max(assignedEstimatedHours, allocatedByMembershipHours);
      const utilizationPercentage = item.availableHours > 0 ? Math.round((loadHours / item.availableHours) * 100) : 0;

      return {
        ...item,
        assignedEstimatedHours,
        actualHours,
        allocatedByMembershipHours,
        utilizationPercentage,
        status: utilizationPercentage > 100 ? "OVER_ALLOCATED" : utilizationPercentage >= 85 ? "HEAVY" : utilizationPercentage >= 50 ? "BALANCED" : "AVAILABLE",
        activeAllocations: allocations,
        tasks: developerTasks
      };
    });
  }
};
