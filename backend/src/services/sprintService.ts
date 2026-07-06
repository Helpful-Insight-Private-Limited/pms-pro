import { prisma } from "../prisma/client.js";
import { sprintRepository } from "../repositories/sprintRepository.js";
import { milestoneService } from "./milestoneService.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";

type SprintInput = {
  name: string;
  goal?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status: "PLANNING" | "ACTIVE" | "HOLD" | "COMPLETED";
  capacity: number;
  velocity: number;
  storyPoints: number;
  progressPercentage: number;
};

function assertSprintDateRange(input: Partial<SprintInput>) {
  if (input.startDate && input.endDate && input.startDate > input.endDate) {
    throw new ApiError(400, "INVALID_SPRINT_DATE_RANGE", "Start date must be before or equal to end date");
  }
}

function applySprintCompletionDefaults(input: SprintInput): SprintInput;
function applySprintCompletionDefaults(input: Partial<SprintInput>): Partial<SprintInput>;
function applySprintCompletionDefaults(input: SprintInput | Partial<SprintInput>) {
  if (input.status === "COMPLETED") {
    return {
      ...input,
      progressPercentage: 100
    };
  }

  return input;
}

async function assertSprintWithinMilestone(projectId: string, milestoneId: string, input: Partial<SprintInput>) {
  const milestone = await prisma.milestone.findFirst({
    where: {
      id: milestoneId,
      projectId,
      deletedAt: null,
      isActive: true
    }
  });

  if (!milestone) {
    throw new ApiError(404, "MILESTONE_NOT_FOUND", "Milestone not found");
  }

  if (milestone.startDate && input.startDate && input.startDate < milestone.startDate) {
    throw new ApiError(400, "SPRINT_OUTSIDE_MILESTONE", "Sprint start date cannot be before milestone start date");
  }

  if (milestone.dueDate && input.endDate && input.endDate > milestone.dueDate) {
    throw new ApiError(400, "SPRINT_OUTSIDE_MILESTONE", "Sprint end date cannot be after milestone due date");
  }
}

async function emitSprintHook(event: string, payload: Record<string, unknown>) {
  // Sprint health and notifications are expanded in dashboard/background job milestones.
  console.log(event, payload);
}

export const sprintService = {
  async listSprints(projectId: string, milestoneId: string, user: AuthUser) {
    await milestoneService.getMilestone(projectId, milestoneId, user);
    return sprintRepository.listByMilestone(projectId, milestoneId);
  },

  async getSprint(projectId: string, milestoneId: string, id: string, user: AuthUser) {
    await milestoneService.getMilestone(projectId, milestoneId, user);
    const sprint = await sprintRepository.findById(projectId, milestoneId, id);

    if (!sprint) {
      throw new ApiError(404, "SPRINT_NOT_FOUND", "Sprint not found");
    }

    return sprint;
  },

  async createSprint(projectId: string, milestoneId: string, input: SprintInput, user: AuthUser) {
    await milestoneService.getMilestone(projectId, milestoneId, user);
    assertSprintDateRange(input);
    await assertSprintWithinMilestone(projectId, milestoneId, input);

    const data = applySprintCompletionDefaults(input);

    const sprint = await prisma.sprint.create({
      data: {
        ...data,
        projectId,
        milestoneId,
        createdBy: user.id
      }
    });

    await emitSprintHook("sprint.created", {
      projectId,
      milestoneId,
      sprintId: sprint.id
    });

    return this.getSprint(projectId, milestoneId, sprint.id, user);
  },

  async updateSprint(projectId: string, milestoneId: string, id: string, input: Partial<SprintInput>, user: AuthUser) {
    const existingSprint = await this.getSprint(projectId, milestoneId, id, user);
    const mergedDates = {
      startDate: input.startDate ?? existingSprint.startDate,
      endDate: input.endDate ?? existingSprint.endDate
    };

    assertSprintDateRange(mergedDates);
    await assertSprintWithinMilestone(projectId, milestoneId, mergedDates);

    const data = applySprintCompletionDefaults(input);

    await prisma.sprint.update({
      where: { id },
      data: {
        ...data,
        updatedBy: user.id
      }
    });

    await emitSprintHook("sprint.updated", {
      projectId,
      milestoneId,
      sprintId: id,
      status: data.status
    });

    return this.getSprint(projectId, milestoneId, id, user);
  },

  async deleteSprint(projectId: string, milestoneId: string, id: string, user: AuthUser) {
    await this.getSprint(projectId, milestoneId, id, user);

    return prisma.sprint.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedBy: user.id
      }
    });
  },

  async calculateSprintHealth(projectId: string, milestoneId: string, id: string, user: AuthUser) {
    const sprint = await this.getSprint(projectId, milestoneId, id, user);
    const progress = Number(sprint.progressPercentage);
    const velocity = Number(sprint.velocity);
    const capacity = Number(sprint.capacity);

    let health: "GOOD" | "WATCH" | "AT_RISK" = "GOOD";

    if (sprint.status === "HOLD" || (capacity > 0 && velocity < capacity * 0.5)) {
      health = "AT_RISK";
    } else if (progress < 50 && sprint.endDate && sprint.endDate < new Date()) {
      health = "WATCH";
    }

    return {
      sprintId: sprint.id,
      status: sprint.status,
      progressPercentage: progress,
      capacity,
      velocity,
      storyPoints: sprint.storyPoints,
      health
    };
  }
};
