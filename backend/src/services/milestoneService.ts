import { prisma } from "../prisma/client.js";
import { milestoneRepository } from "../repositories/milestoneRepository.js";
import { projectService } from "./projectService.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";

type MilestoneInput = {
  title: string;
  description?: string | null;
  startDate?: Date | null;
  dueDate?: Date | null;
  responsibleUserId?: string | null;
  status: "PENDING" | "ACTIVE" | "HOLD" | "COMPLETED" | "DELAYED";
  progressPercentage: number;
  notes?: string | null;
};

function assertDateRange(input: Partial<MilestoneInput>) {
  if (input.startDate && input.dueDate && input.startDate > input.dueDate) {
    throw new ApiError(400, "INVALID_MILESTONE_DATE_RANGE", "Start date must be before or equal to due date");
  }
}

async function ensureResponsibleUser(projectId: string, responsibleUserId?: string | null) {
  if (!responsibleUserId) {
    return;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null
    },
    include: {
      members: {
        where: {
          userId: responsibleUserId,
          deletedAt: null,
          isActive: true,
          releasedDate: null
        }
      }
    }
  });

  if (!project) {
    throw new ApiError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  const isManager = project.projectManagerId === responsibleUserId;
  const isTeamLeader = project.teamLeaderId === responsibleUserId;
  const isMember = project.members.length > 0;

  if (!isManager && !isTeamLeader && !isMember) {
    throw new ApiError(400, "INVALID_RESPONSIBLE_USER", "Responsible user must belong to the project");
  }
}

function applyCompletionDefaults(input: MilestoneInput): MilestoneInput;
function applyCompletionDefaults(input: Partial<MilestoneInput>): Partial<MilestoneInput>;
function applyCompletionDefaults(input: MilestoneInput | Partial<MilestoneInput>) {
  if (input.status === "COMPLETED") {
    return {
      ...input,
      progressPercentage: 100
    };
  }

  return input;
}

async function emitMilestoneHook(event: string, payload: Record<string, unknown>) {
  // Reminder and dashboard notifications are implemented in later milestones.
  console.log(event, payload);
}

export const milestoneService = {
  async listMilestones(projectId: string, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    return milestoneRepository.listByProject(projectId);
  },

  async getMilestone(projectId: string, id: string, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    const milestone = await milestoneRepository.findById(projectId, id);

    if (!milestone) {
      throw new ApiError(404, "MILESTONE_NOT_FOUND", "Milestone not found");
    }

    return milestone;
  },

  async createMilestone(projectId: string, input: MilestoneInput, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    assertDateRange(input);
    await ensureResponsibleUser(projectId, input.responsibleUserId);

    const data = applyCompletionDefaults(input);

    const milestone = await prisma.milestone.create({
      data: {
        ...data,
        projectId,
        createdBy: user.id
      }
    });

    await emitMilestoneHook("milestone.created", {
      projectId,
      milestoneId: milestone.id,
      responsibleUserId: input.responsibleUserId
    });

    return this.getMilestone(projectId, milestone.id, user);
  },

  async updateMilestone(projectId: string, id: string, input: Partial<MilestoneInput>, user: AuthUser) {
    const existingMilestone = await this.getMilestone(projectId, id, user);
    const mergedDates = {
      startDate: input.startDate ?? existingMilestone.startDate,
      dueDate: input.dueDate ?? existingMilestone.dueDate
    };

    assertDateRange(mergedDates);
    await ensureResponsibleUser(projectId, input.responsibleUserId);

    const data = applyCompletionDefaults(input);

    await prisma.milestone.update({
      where: { id },
      data: {
        ...data,
        updatedBy: user.id
      }
    });

    await emitMilestoneHook("milestone.updated", {
      projectId,
      milestoneId: id,
      status: data.status
    });

    return this.getMilestone(projectId, id, user);
  },

  async deleteMilestone(projectId: string, id: string, user: AuthUser) {
    await this.getMilestone(projectId, id, user);

    return prisma.milestone.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedBy: user.id
      }
    });
  },

  async markDelayedMilestones(projectId: string, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    const candidates = await milestoneRepository.findDelayedCandidates(projectId, new Date());

    if (candidates.length === 0) {
      return [];
    }

    await prisma.milestone.updateMany({
      where: {
        id: {
          in: candidates.map((milestone) => milestone.id)
        }
      },
      data: {
        status: "DELAYED",
        updatedBy: user.id
      }
    });

    await emitMilestoneHook("milestone.delayed.detected", {
      projectId,
      milestoneIds: candidates.map((milestone) => milestone.id)
    });

    return milestoneRepository.listByProject(projectId);
  }
};
