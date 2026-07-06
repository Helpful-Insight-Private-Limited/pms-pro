import { prisma } from "../prisma/client.js";
import type { AuthUser } from "../types/auth.js";

const projectInclude = {
  client: true,
  projectManager: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    }
  },
  teamLeader: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    }
  },
  members: {
    where: {
      deletedAt: null,
      isActive: true
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    }
  }
} as const;

function accessWhere(user: AuthUser) {
  if (user.roles.includes("admin")) {
    return {};
  }

  return {
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

function canViewBudget(user: AuthUser) {
  return user.roles.includes("admin") || user.permissions.includes("project.viewBudget") || user.permissions.includes("project.viewCosting");
}

function redactProjectForUser<T extends { budget?: unknown; currency?: unknown; client?: unknown }>(project: T, user: AuthUser) {
  if (canViewBudget(user)) return project;

  return {
    ...project,
    budget: undefined,
    currency: undefined,
    client: undefined
  };
}

export const projectRepository = {
  async listForUser(user: AuthUser) {
    const projects = await prisma.project.findMany({
      where: {
        deletedAt: null,
        ...accessWhere(user)
      },
      orderBy: {
        createdAt: "desc"
      },
      include: projectInclude
    });
    return projects.map((project) => redactProjectForUser(project, user));
  },

  async findAccessibleById(id: string, user: AuthUser) {
    const project = await prisma.project.findFirst({
      where: {
        id,
        deletedAt: null,
        ...accessWhere(user)
      },
      include: projectInclude
    });
    return project ? redactProjectForUser(project, user) : null;
  },

  findByCode(code: string) {
    return prisma.project.findUnique({
      where: { code }
    });
  }
};
