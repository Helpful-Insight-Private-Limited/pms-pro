import { prisma } from "../prisma/client.js";

const taskInclude = {
  milestone: { select: { id: true, title: true, status: true } },
  sprint: { select: { id: true, name: true, status: true } },
  assignedDeveloper: { select: { id: true, firstName: true, lastName: true, email: true } },
  reviewer: { select: { id: true, firstName: true, lastName: true, email: true } },
  subtasks: { where: { deletedAt: null }, select: { id: true, title: true, status: true, progressPercentage: true } },
  blockers: { where: { deletedAt: null } },
  dependencies: { include: { dependsOnTask: { select: { id: true, title: true, status: true } } } }
} as const;

export const taskRepository = {
  listByProject(projectId: string) {
    return prisma.task.findMany({
      where: { projectId, deletedAt: null },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: taskInclude
    });
  },

  findById(projectId: string, id: string) {
    return prisma.task.findFirst({
      where: { id, projectId, deletedAt: null },
      include: taskInclude
    });
  },

  findComments(taskId: string) {
    return prisma.taskComment.findMany({
      where: { taskId, deletedAt: null, isActive: true },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
    });
  },

  findAttachments(taskId: string) {
    return prisma.taskAttachment.findMany({
      where: { taskId, deletedAt: null, isActive: true },
      orderBy: { createdAt: "desc" }
    });
  }
};
