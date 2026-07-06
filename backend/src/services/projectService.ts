import { prisma } from "../prisma/client.js";
import { projectRepository } from "../repositories/projectRepository.js";
import { activityLogService } from "./activityLogService.js";
import { notificationService } from "./notificationService.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";

type CreateProjectInput = {
  title: string;
  code: string;
  clientId: string;
  description?: string | null;
  budget: number;
  currency: string;
  startDate?: Date | null;
  endDate?: Date | null;
  status: "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "DELAYED";
  technologyStack: string[];
  projectManagerId: string;
  teamLeaderId?: string | null;
  teamMemberIds: string[];
  gitRepositoryUrl?: string | null;
  stagingUrl?: string | null;
  productionUrl?: string | null;
  apiDocumentationUrl?: string | null;
  notes?: string | null;
};

type ProjectMemberInput = {
  userId: string;
  roleInProject: "PROJECT_MANAGER" | "TEAM_LEADER" | "DEVELOPER" | "REVIEWER" | "QA" | "DESIGNER" | "OBSERVER";
  allocationPercentage: number;
  assignedDate?: Date;
  releasedDate?: Date | null;
};

async function ensureClientExists(clientId: string) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      deletedAt: null,
      isActive: true
    }
  });

  if (!client) {
    throw new ApiError(400, "INVALID_CLIENT", "Client does not exist or is inactive");
  }
}

async function ensureUsersExist(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (uniqueUserIds.length === 0) {
    return;
  }

  const userCount = await prisma.user.count({
    where: {
      id: { in: uniqueUserIds },
      deletedAt: null,
      isActive: true
    }
  });

  if (userCount !== uniqueUserIds.length) {
    throw new ApiError(400, "INVALID_PROJECT_USERS", "One or more project users are invalid");
  }
}

function buildInitialMembers(input: CreateProjectInput): ProjectMemberInput[] {
  const members = new Map<string, ProjectMemberInput>();

  members.set(input.projectManagerId, {
    userId: input.projectManagerId,
    roleInProject: "PROJECT_MANAGER",
    allocationPercentage: 100
  });

  if (input.teamLeaderId) {
    members.set(input.teamLeaderId, {
      userId: input.teamLeaderId,
      roleInProject: "TEAM_LEADER",
      allocationPercentage: 100
    });
  }

  for (const userId of input.teamMemberIds) {
    if (!members.has(userId)) {
      members.set(userId, {
        userId,
        roleInProject: "DEVELOPER",
        allocationPercentage: 100
      });
    }
  }

  return [...members.values()];
}

async function emitProjectAssignmentHooks(projectId: string, userIds: string[]) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { title: true } });

  await notificationService.createFromDomainEvent({
    templateKey: "project.assigned.in_app",
    type: "PROJECT_ASSIGNED",
    userIds,
    title: "Project assigned",
    message: `You have been assigned to ${project?.title ?? "Project"}.`,
    entityType: "Project",
    entityId: projectId,
    variables: { projectTitle: project?.title ?? "Project" },
    metadata: { projectId },
    sendEmail: false
  });
}

export const projectService = {
  listProjects(user: AuthUser) {
    return projectRepository.listForUser(user);
  },

  async getProjectById(id: string, user: AuthUser) {
    const project = await projectRepository.findAccessibleById(id, user);

    if (!project) {
      throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found");
    }

    return project;
  },

  async createProject(input: CreateProjectInput, user: AuthUser) {
    await ensureClientExists(input.clientId);
    await ensureUsersExist([input.projectManagerId, input.teamLeaderId ?? "", ...input.teamMemberIds]);

    const existingProject = await projectRepository.findByCode(input.code);

    if (existingProject) {
      throw new ApiError(409, "PROJECT_CODE_EXISTS", "Project code already exists");
    }

    const members = buildInitialMembers(input);

    const project = await prisma.$transaction(async (tx) => {
      const createdProject = await tx.project.create({
        data: {
          title: input.title,
          code: input.code,
          clientId: input.clientId,
          description: input.description,
          budget: input.budget,
          currency: input.currency,
          startDate: input.startDate,
          endDate: input.endDate,
          status: input.status,
          technologyStack: input.technologyStack,
          projectManagerId: input.projectManagerId,
          teamLeaderId: input.teamLeaderId,
          gitRepositoryUrl: input.gitRepositoryUrl,
          stagingUrl: input.stagingUrl,
          productionUrl: input.productionUrl,
          apiDocumentationUrl: input.apiDocumentationUrl,
          notes: input.notes,
          createdBy: user.id
        }
      });

      await tx.projectMember.createMany({
        data: members.map((member) => ({
          projectId: createdProject.id,
          userId: member.userId,
          roleInProject: member.roleInProject,
          allocationPercentage: member.allocationPercentage,
          createdBy: user.id
        })),
        skipDuplicates: true
      });

      return createdProject;
    });

    await emitProjectAssignmentHooks(project.id, members.map((member) => member.userId));
    await activityLogService.create({
      actorId: user.id,
      action: "project.created",
      module: "project",
      entityType: "Project",
      entityId: project.id,
      projectId: project.id,
      metadata: {
        title: input.title,
        code: input.code,
        status: input.status,
        budget: input.budget,
        currency: input.currency,
        memberCount: members.length
      }
    });
    return this.getProjectById(project.id, user);
  },

  async updateProject(id: string, input: Partial<CreateProjectInput>, user: AuthUser) {
    const existingProject = await this.getProjectById(id, user);

    if (input.clientId) {
      await ensureClientExists(input.clientId);
    }

    if (input.projectManagerId || input.teamLeaderId) {
      await ensureUsersExist([input.projectManagerId ?? "", input.teamLeaderId ?? ""]);
    }

    if (input.code) {
      const existingProject = await projectRepository.findByCode(input.code);

      if (existingProject && existingProject.id !== id) {
        throw new ApiError(409, "PROJECT_CODE_EXISTS", "Project code already exists");
      }
    }

    await prisma.project.update({
      where: { id },
      data: {
        ...input,
        teamMemberIds: undefined,
        updatedBy: user.id
      }
    });

    if (input.status === "COMPLETED" && existingProject.status !== "COMPLETED") {
      const projectUsers = await prisma.project.findUnique({
        where: { id },
        select: {
          title: true,
          projectManagerId: true,
          teamLeaderId: true,
          members: {
            where: { deletedAt: null, isActive: true, releasedDate: null },
            select: { userId: true }
          }
        }
      });
      const userIds = [
        ...new Set(
          [projectUsers?.projectManagerId, projectUsers?.teamLeaderId, ...(projectUsers?.members.map((member) => member.userId) ?? [])].filter((value): value is string => Boolean(value))
        )
      ];

      await notificationService.createFromDomainEvent({
        type: "SYSTEM",
        userIds,
        title: "Project completed",
        message: `${projectUsers?.title ?? "Project"} has been marked completed.`,
        entityType: "Project",
        entityId: id,
        variables: { projectTitle: projectUsers?.title ?? "Project" },
        metadata: { projectId: id, status: "COMPLETED" },
        sendEmail: false
      });
    }

    await activityLogService.create({
      actorId: user.id,
      action: "project.updated",
      module: "project",
      entityType: "Project",
      entityId: id,
      projectId: id,
      metadata: {
        changedFields: Object.keys(input).filter((key) => key !== "teamMemberIds"),
        status: input.status,
        budget: input.budget,
        currency: input.currency
      }
    });
    return this.getProjectById(id, user);
  },

  async softDeleteProject(id: string, user: AuthUser) {
    await this.getProjectById(id, user);

    const project = await prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedBy: user.id
      }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "project.deleted",
      module: "project",
      entityType: "Project",
      entityId: id,
      projectId: id,
      metadata: { title: project.title, code: project.code }
    });

    return project;
  },

  async assignMembers(projectId: string, members: ProjectMemberInput[], user: AuthUser) {
    await this.getProjectById(projectId, user);
    await ensureUsersExist(members.map((member) => member.userId));

    const project = await prisma.$transaction(async (tx) => {
      await tx.projectMember.updateMany({
        where: {
          projectId,
          isActive: true,
          deletedAt: null
        },
        data: {
          isActive: false,
          releasedDate: new Date(),
          updatedBy: user.id
        }
      });

      for (const member of members) {
        await tx.projectMember.upsert({
          where: {
            projectId_userId: {
              projectId,
              userId: member.userId
            }
          },
          update: {
            roleInProject: member.roleInProject,
            allocationPercentage: member.allocationPercentage,
            assignedDate: member.assignedDate,
            releasedDate: member.releasedDate ?? null,
            isActive: true,
            deletedAt: null,
            updatedBy: user.id
          },
          create: {
            projectId,
            userId: member.userId,
            roleInProject: member.roleInProject,
            allocationPercentage: member.allocationPercentage,
            assignedDate: member.assignedDate,
            releasedDate: member.releasedDate,
            createdBy: user.id
          }
        });
      }

      return tx.project.findUniqueOrThrow({
        where: { id: projectId }
      });
    });

    await emitProjectAssignmentHooks(project.id, members.map((member) => member.userId));
    await activityLogService.create({
      actorId: user.id,
      action: "project.teamAssigned",
      module: "project",
      entityType: "Project",
      entityId: project.id,
      projectId: project.id,
      metadata: {
        memberCount: members.length,
        memberIds: members.map((member) => member.userId)
      }
    });
    return this.getProjectById(project.id, user);
  }
};
