import { prisma } from "../prisma/client.js";
import { taskRepository } from "../repositories/taskRepository.js";
import { activityLogService } from "./activityLogService.js";
import { notificationService } from "./notificationService.js";
import { progressService } from "./progressService.js";
import { projectService } from "./projectService.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";

type TaskInput = {
  milestoneId?: string | null;
  sprintId?: string | null;
  parentTaskId?: string | null;
  title: string;
  description?: string | null;
  assignedDeveloperId?: string | null;
  reviewerId?: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "TESTING" | "COMPLETED" | "BLOCKED" | "HOLD";
  estimatedHours: number;
  actualHours: number;
  storyPoints: number;
  progressPercentage: number;
  startDate?: Date | null;
  dueDate?: Date | null;
  completedDate?: Date | null;
  labels: string[];
  dependencyTaskIds: string[];
};

function assertTaskDateRange(input: Partial<TaskInput>) {
  if (input.startDate && input.dueDate && input.startDate > input.dueDate) {
    throw new ApiError(400, "INVALID_TASK_DATE_RANGE", "Start date must be before or equal to due date");
  }
}

function applyTaskCompletionDefaults(input: TaskInput): TaskInput;
function applyTaskCompletionDefaults(input: Partial<TaskInput>): Partial<TaskInput>;
function applyTaskCompletionDefaults(input: TaskInput | Partial<TaskInput>) {
  if (input.status === "COMPLETED") {
    return {
      ...input,
      progressPercentage: 100,
      completedDate: input.completedDate ?? new Date()
    };
  }

  return input;
}

async function ensureProjectUser(projectId: string, userId?: string | null, field = "user") {
  if (!userId) return;

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: {
      members: {
        where: { userId, deletedAt: null, isActive: true, releasedDate: null }
      }
    }
  });

  if (!project) throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found");

  if (project.projectManagerId !== userId && project.teamLeaderId !== userId && project.members.length === 0) {
    throw new ApiError(400, "INVALID_PROJECT_USER", `${field} must belong to the project`);
  }
}

async function ensureTaskRelations(projectId: string, input: Partial<TaskInput>, currentTaskId?: string) {
  if (input.milestoneId) {
    const milestone = await prisma.milestone.findFirst({ where: { id: input.milestoneId, projectId, deletedAt: null } });
    if (!milestone) throw new ApiError(400, "INVALID_MILESTONE", "Milestone does not belong to project");
  }

  if (input.sprintId) {
    const sprint = await prisma.sprint.findFirst({ where: { id: input.sprintId, projectId, deletedAt: null } });
    if (!sprint) throw new ApiError(400, "INVALID_SPRINT", "Sprint does not belong to project");
    if (input.milestoneId && sprint.milestoneId !== input.milestoneId) {
      throw new ApiError(400, "SPRINT_MILESTONE_MISMATCH", "Sprint must belong to selected milestone");
    }
  }

  if (input.parentTaskId) {
    if (input.parentTaskId === currentTaskId) throw new ApiError(400, "INVALID_PARENT_TASK", "Task cannot be its own parent");
    const parent = await prisma.task.findFirst({ where: { id: input.parentTaskId, projectId, deletedAt: null } });
    if (!parent) throw new ApiError(400, "INVALID_PARENT_TASK", "Parent task does not belong to project");
  }

  const dependencyTaskIds = input.dependencyTaskIds ?? [];
  if (dependencyTaskIds.length > 0) {
    if (currentTaskId && dependencyTaskIds.includes(currentTaskId)) {
      throw new ApiError(400, "INVALID_TASK_DEPENDENCY", "Task cannot depend on itself");
    }
    const count = await prisma.task.count({ where: { id: { in: dependencyTaskIds }, projectId, deletedAt: null } });
    if (count !== new Set(dependencyTaskIds).size) {
      throw new ApiError(400, "INVALID_TASK_DEPENDENCY", "One or more dependencies are invalid");
    }
  }
}

async function emitTaskHook(event: string, payload: Record<string, unknown>) {
  if (event === "task.created" && typeof payload.assignedDeveloperId === "string") {
    await notificationService.createFromDomainEvent({
      templateKey: "task.assigned.in_app",
      type: "TASK_ASSIGNED",
      userIds: [payload.assignedDeveloperId],
      title: "Task assigned",
      message: `You have been assigned task ${String(payload.title ?? "Task")}.`,
      entityType: "Task",
      entityId: String(payload.taskId),
      variables: {
        taskTitle: String(payload.title ?? "Task"),
        projectTitle: String(payload.projectTitle ?? "Project")
      },
      metadata: { projectId: String(payload.projectId), taskId: String(payload.taskId) },
      sendEmail: false
    });
  }

  if (event === "task.updated" && typeof payload.assignedDeveloperId === "string") {
    await notificationService.createFromDomainEvent({
      templateKey: "task.updated.in_app",
      type: "TASK_UPDATED",
      userIds: [payload.assignedDeveloperId],
      title: "Task updated",
      message: `${String(payload.title ?? "Task")} was updated.`,
      entityType: "Task",
      entityId: String(payload.taskId),
      variables: {
        taskTitle: String(payload.title ?? "Task"),
        summary: `Status: ${String(payload.status ?? "updated")}`
      },
      metadata: { projectId: String(payload.projectId), taskId: String(payload.taskId), status: String(payload.status ?? "") },
      sendEmail: false
    });
  }
}

async function projectTaskStakeholders(projectId: string, task: { assignedDeveloperId: string | null; reviewerId?: string | null }) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { title: true, projectManagerId: true, teamLeaderId: true }
  });

  return {
    projectTitle: project?.title ?? "Project",
    userIds: [...new Set([project?.projectManagerId, project?.teamLeaderId, task.assignedDeveloperId, task.reviewerId].filter((value): value is string => Boolean(value)))]
  };
}

function canManageProjectTasks(user: AuthUser) {
  return user.roles.includes("admin") || user.permissions.includes("task.assign") || user.permissions.includes("task.create");
}

function assertTaskVisibleToUser(task: { assignedDeveloperId: string | null; reviewerId?: string | null }, user: AuthUser) {
  if (canManageProjectTasks(user)) return;
  if (task.assignedDeveloperId === user.id || task.reviewerId === user.id) return;
  throw new ApiError(404, "TASK_NOT_FOUND", "Task not found");
}

function assertTaskEditableByUser(task: { assignedDeveloperId: string | null }, user: AuthUser) {
  if (canManageProjectTasks(user)) return;
  if (task.assignedDeveloperId === user.id) return;
  throw new ApiError(403, "FORBIDDEN", "Only the assigned developer or task managers can update this task");
}

export const taskService = {
  async listTasks(projectId: string, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    const tasks = await taskRepository.listByProject(projectId);
    if (canManageProjectTasks(user)) return tasks;
    return tasks.filter((task) => task.assignedDeveloperId === user.id || task.reviewerId === user.id);
  },

  async getTask(projectId: string, taskId: string, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    const task = await taskRepository.findById(projectId, taskId);
    if (!task) throw new ApiError(404, "TASK_NOT_FOUND", "Task not found");
    assertTaskVisibleToUser(task, user);
    return task;
  },

  async createTask(projectId: string, input: TaskInput, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    assertTaskDateRange(input);
    await ensureProjectUser(projectId, input.assignedDeveloperId, "Assigned developer");
    await ensureProjectUser(projectId, input.reviewerId, "Reviewer");
    await ensureTaskRelations(projectId, input);

    const data = applyTaskCompletionDefaults(input);
    const dependencyTaskIds = [...new Set(data.dependencyTaskIds)];

    const task = await prisma.$transaction(async (tx) => {
      const createdTask = await tx.task.create({
        data: {
          ...data,
          dependencyTaskIds: undefined,
          projectId,
          createdBy: user.id
        }
      });

      if (dependencyTaskIds.length > 0) {
        await tx.taskDependency.createMany({
          data: dependencyTaskIds.map((dependsOnTaskId) => ({
            taskId: createdTask.id,
            dependsOnTaskId,
            createdBy: user.id
          })),
          skipDuplicates: true
        });
      }

      return createdTask;
    });

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { title: true } });
    await emitTaskHook("task.created", {
      projectId,
      taskId: task.id,
      title: task.title,
      projectTitle: project?.title,
      assignedDeveloperId: data.assignedDeveloperId
    });
    await activityLogService.create({
      actorId: user.id,
      action: "task.created",
      module: "task",
      entityType: "Task",
      entityId: task.id,
      projectId,
      taskId: task.id,
      metadata: {
        title: task.title,
        status: task.status,
        priority: task.priority,
        assignedDeveloperId: task.assignedDeveloperId
      }
    });
    await progressService.recalculateForTask(projectId, [{ milestoneId: task.milestoneId, sprintId: task.sprintId }]);
    return this.getTask(projectId, task.id, user);
  },

  async updateTask(projectId: string, taskId: string, input: Partial<TaskInput>, user: AuthUser) {
    const existingTask = await this.getTask(projectId, taskId, user);
    assertTaskEditableByUser(existingTask, user);
    assertTaskDateRange({
      startDate: input.startDate ?? existingTask.startDate,
      dueDate: input.dueDate ?? existingTask.dueDate
    });
    await ensureProjectUser(projectId, input.assignedDeveloperId, "Assigned developer");
    await ensureProjectUser(projectId, input.reviewerId, "Reviewer");
    await ensureTaskRelations(projectId, input, taskId);

    const data = applyTaskCompletionDefaults(input);

    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: {
          ...data,
          dependencyTaskIds: undefined,
          updatedBy: user.id
        }
      });

      if (input.dependencyTaskIds) {
        await tx.taskDependency.deleteMany({ where: { taskId } });
        await tx.taskDependency.createMany({
          data: [...new Set(input.dependencyTaskIds)].map((dependsOnTaskId) => ({
            taskId,
            dependsOnTaskId,
            createdBy: user.id
          })),
          skipDuplicates: true
        });
      }
    });

    await emitTaskHook("task.updated", {
      projectId,
      taskId,
      title: existingTask.title,
      status: data.status,
      assignedDeveloperId: input.assignedDeveloperId ?? existingTask.assignedDeveloperId
    });

    if (data.status === "COMPLETED" && existingTask.status !== "COMPLETED") {
      const stakeholders = await projectTaskStakeholders(projectId, existingTask);
      await notificationService.createFromDomainEvent({
        type: "TASK_UPDATED",
        userIds: stakeholders.userIds,
        title: "Task completed",
        message: `${existingTask.title} has been marked completed.`,
        entityType: "Task",
        entityId: taskId,
        variables: {
          taskTitle: existingTask.title,
          projectTitle: stakeholders.projectTitle,
          summary: "Completed"
        },
        metadata: { projectId, taskId, projectTitle: stakeholders.projectTitle, status: "COMPLETED" },
        sendEmail: false
      });
    }

    await activityLogService.create({
      actorId: user.id,
      action: "task.updated",
      module: "task",
      entityType: "Task",
      entityId: taskId,
      projectId,
      taskId,
      metadata: {
        changedFields: Object.keys(input),
        previousStatus: existingTask.status,
        status: data.status ?? existingTask.status,
        assignedDeveloperId: input.assignedDeveloperId ?? existingTask.assignedDeveloperId
      }
    });
    const updatedTask = await this.getTask(projectId, taskId, user);
    await progressService.recalculateForTask(projectId, [
      { milestoneId: existingTask.milestoneId, sprintId: existingTask.sprintId },
      { milestoneId: updatedTask.milestoneId, sprintId: updatedTask.sprintId }
    ]);
    return updatedTask;
  },

  async deleteTask(projectId: string, taskId: string, user: AuthUser) {
    const task = await this.getTask(projectId, taskId, user);
    if (!canManageProjectTasks(user)) {
      throw new ApiError(403, "FORBIDDEN", "Only task managers can delete tasks");
    }
    const deletedTask = await prisma.task.update({ where: { id: taskId }, data: { deletedAt: new Date(), isActive: false, updatedBy: user.id } });
    await activityLogService.create({
      actorId: user.id,
      action: "task.deleted",
      module: "task",
      entityType: "Task",
      entityId: taskId,
      projectId,
      taskId,
      metadata: { title: task.title, status: task.status }
    });
    await progressService.recalculateForTask(projectId, [{ milestoneId: task.milestoneId, sprintId: task.sprintId }]);
    return deletedTask;
  },

  async addComment(projectId: string, taskId: string, input: { comment: string; mentions: string[] }, user: AuthUser) {
    await this.getTask(projectId, taskId, user);
    const comment = await prisma.taskComment.create({ data: { taskId, userId: user.id, comment: input.comment, mentions: input.mentions } });
    await activityLogService.create({
      actorId: user.id,
      action: "task.commentAdded",
      module: "task",
      entityType: "TaskComment",
      entityId: comment.id,
      projectId,
      taskId,
      metadata: { mentionCount: input.mentions.length }
    });
    return comment;
  },

  async listComments(projectId: string, taskId: string, user: AuthUser) {
    await this.getTask(projectId, taskId, user);
    return taskRepository.findComments(taskId);
  },

  async addBlocker(projectId: string, taskId: string, input: { description: string }, user: AuthUser) {
    const task = await this.getTask(projectId, taskId, user);
    await prisma.task.update({ where: { id: taskId }, data: { status: "BLOCKED", updatedBy: user.id } });
    const blocker = await prisma.taskBlocker.create({ data: { taskId, description: input.description, reportedBy: user.id } });
    const stakeholders = await projectTaskStakeholders(projectId, task);
    await notificationService.createFromDomainEvent({
      type: "TASK_BLOCKED",
      userIds: stakeholders.userIds,
      title: "Task blocker added",
      message: `${task.title} is blocked: ${input.description}`,
      entityType: "Task",
      entityId: taskId,
      variables: {
        taskTitle: task.title,
        projectTitle: stakeholders.projectTitle,
        summary: input.description
      },
      metadata: { projectId, taskId, blockerId: blocker.id, projectTitle: stakeholders.projectTitle },
      sendEmail: false
    });
    await activityLogService.create({
      actorId: user.id,
      action: "task.blockerAdded",
      module: "task",
      entityType: "TaskBlocker",
      entityId: blocker.id,
      projectId,
      taskId,
      metadata: { taskStatus: "BLOCKED" }
    });
    await progressService.recalculateForTask(projectId, [{ milestoneId: task.milestoneId, sprintId: task.sprintId }]);
    return blocker;
  },

  async updateBlocker(projectId: string, taskId: string, blockerId: string, input: { isResolved: boolean }, user: AuthUser) {
    await this.getTask(projectId, taskId, user);
    const blocker = await prisma.taskBlocker.update({
      where: { id: blockerId },
      data: { isResolved: input.isResolved, resolvedAt: input.isResolved ? new Date() : null }
    });
    await activityLogService.create({
      actorId: user.id,
      action: input.isResolved ? "task.blockerResolved" : "task.blockerReopened",
      module: "task",
      entityType: "TaskBlocker",
      entityId: blockerId,
      projectId,
      taskId,
      metadata: { isResolved: input.isResolved }
    });
    return blocker;
  },

  async addAttachment(projectId: string, taskId: string, input: {
    fileName: string; originalName: string; mimeType: string; fileSize: number; storagePath: string; publicUrl?: string | null;
  }, user: AuthUser) {
    await this.getTask(projectId, taskId, user);
    const attachment = await prisma.taskAttachment.create({ data: { ...input, taskId, uploadedBy: user.id } });
    await activityLogService.create({
      actorId: user.id,
      action: "task.attachmentAdded",
      module: "task",
      entityType: "TaskAttachment",
      entityId: attachment.id,
      projectId,
      taskId,
      metadata: { fileName: input.fileName, mimeType: input.mimeType, fileSize: input.fileSize }
    });
    return attachment;
  },

  async listAttachments(projectId: string, taskId: string, user: AuthUser) {
    await this.getTask(projectId, taskId, user);
    return taskRepository.findAttachments(taskId);
  }
};
