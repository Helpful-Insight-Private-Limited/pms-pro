import { prisma } from "../prisma/client.js";
import type { Prisma } from "../generated/prisma/index.js";
import { userRepository } from "../repositories/userRepository.js";
import { ApiError } from "../utils/apiError.js";
import { hashPassword } from "../utils/password.js";
import type { AuthUser } from "../types/auth.js";

const userListInclude = {
  userRoles: {
    where: { isActive: true, revokedAt: null },
    include: { role: true }
  },
  developerProfile: true,
  projectMemberships: {
    where: { deletedAt: null, isActive: true, releasedDate: null },
    include: {
      project: {
        select: { id: true, title: true, code: true, projectManagerId: true, teamLeaderId: true }
      }
    }
  },
  managedProjects: {
    where: { deletedAt: null, isActive: true },
    select: { id: true, title: true, code: true }
  },
  ledProjects: {
    where: { deletedAt: null, isActive: true },
    select: { id: true, title: true, code: true }
  }
} as const;

function isAdmin(user?: AuthUser) {
  return Boolean(user?.roles.includes("admin"));
}

async function visibleUserIdsFor(user: AuthUser) {
  const visibleUserIds = new Set<string>([user.id]);

  if (user.roles.includes("projectManager")) {
    const ownedUsers = await prisma.user.findMany({
      where: {
        createdBy: user.id,
        deletedAt: null,
        isActive: true
      },
      select: { id: true }
    });

    for (const ownedUser of ownedUsers) visibleUserIds.add(ownedUser.id);

    const projects = await prisma.project.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { projectManagerId: user.id },
          {
            members: {
              some: {
                userId: user.id,
                roleInProject: "PROJECT_MANAGER",
                deletedAt: null,
                isActive: true,
                releasedDate: null
              }
            }
          }
        ]
      },
      select: {
        projectManagerId: true,
        teamLeaderId: true,
        members: { where: { deletedAt: null, isActive: true, releasedDate: null }, select: { userId: true } }
      }
    });

    for (const project of projects) {
      visibleUserIds.add(project.projectManagerId);
      if (project.teamLeaderId) visibleUserIds.add(project.teamLeaderId);
      for (const member of project.members) visibleUserIds.add(member.userId);
    }
  }

  if (user.roles.includes("teamLeader")) {
    const projects = await prisma.project.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { teamLeaderId: user.id },
          {
            members: {
              some: {
                userId: user.id,
                roleInProject: "TEAM_LEADER",
                deletedAt: null,
                isActive: true,
                releasedDate: null
              }
            }
          }
        ]
      },
      select: {
        projectManagerId: true,
        teamLeaderId: true,
        members: { where: { deletedAt: null, isActive: true, releasedDate: null }, select: { userId: true } }
      }
    });

    for (const project of projects) {
      visibleUserIds.add(project.projectManagerId);
      if (project.teamLeaderId) visibleUserIds.add(project.teamLeaderId);
      for (const member of project.members) visibleUserIds.add(member.userId);
    }
  }

  return [...visibleUserIds];
}

async function allowedRoleIdsFor(actor?: AuthUser) {
  if (isAdmin(actor)) {
    const roles = await prisma.role.findMany({ where: { deletedAt: null, isActive: true }, select: { id: true } });
    return new Set(roles.map((role) => role.id));
  }

  const allowedSlugs = actor?.roles.includes("projectManager")
    ? ["teamLeader", "teamMember"]
    : actor?.roles.includes("teamLeader")
      ? ["teamMember"]
      : [];

  const roles = await prisma.role.findMany({
    where: { slug: { in: allowedSlugs }, deletedAt: null, isActive: true },
    select: { id: true }
  });

  return new Set(roles.map((role) => role.id));
}

async function assertRolesAllowed(roleIds: string[], actor?: AuthUser) {
  const allowedRoleIds = await allowedRoleIdsFor(actor);

  if (roleIds.some((roleId) => !allowedRoleIds.has(roleId))) {
    throw new ApiError(403, "ROLE_ASSIGNMENT_FORBIDDEN", "You cannot assign one or more selected roles");
  }
}

async function autoAttachCreatedUserToManagedProjects(tx: Prisma.TransactionClient, createdUserId: string, roleIds: string[], actor?: AuthUser) {
  if (!actor?.roles.includes("projectManager")) return;

  const selectedRoles = await tx.role.findMany({ where: { id: { in: roleIds } }, select: { slug: true } });
  const roleInProject = selectedRoles.some((role) => role.slug === "teamLeader") ? "TEAM_LEADER" : "DEVELOPER";
  const projects = await tx.project.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      OR: [
        { projectManagerId: actor.id },
        {
          members: {
            some: {
              userId: actor.id,
              roleInProject: "PROJECT_MANAGER",
              deletedAt: null,
              isActive: true,
              releasedDate: null
            }
          }
        }
      ]
    },
    select: { id: true }
  });

  for (const project of projects) {
    await tx.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: createdUserId } },
      update: {
        roleInProject,
        allocationPercentage: 100,
        releasedDate: null,
        deletedAt: null,
        isActive: true,
        updatedBy: actor.id
      },
      create: {
        projectId: project.id,
        userId: createdUserId,
        roleInProject,
        allocationPercentage: 100,
        createdBy: actor.id
      }
    });
  }
}

export const userService = {
  async listUsers(user: AuthUser) {
    if (user.roles.includes("admin")) {
      return userRepository.list();
    }

    const visibleUserIds = await visibleUserIdsFor(user);

    return prisma.user.findMany({
      where: { id: { in: visibleUserIds }, deletedAt: null, isActive: true },
      include: userListInclude,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
    });
  },

  async listAllUsers() {
    return userRepository.list();
  },

  async getUserById(id: string, actor?: AuthUser) {
    if (actor && !actor.roles.includes("admin")) {
      const visibleUserIds = await visibleUserIdsFor(actor);
      if (!visibleUserIds.includes(id)) {
        throw new ApiError(404, "USER_NOT_FOUND", "User not found");
      }
    }

    const user = await userRepository.findById(id);

    if (!user || user.deletedAt) {
      throw new ApiError(404, "USER_NOT_FOUND", "User not found");
    }

    return user;
  },

  async createUser(input: {
    firstName: string;
    lastName?: string;
    email: string;
    password: string;
    phone?: string;
    roleIds: string[];
  }, actor?: AuthUser) {
    await assertRolesAllowed(input.roleIds, actor);
    const existingUser = await userRepository.findByEmail(input.email);

    if (existingUser && !existingUser.deletedAt) {
      throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "Email already exists");
    }

    const roleCount = await prisma.role.count({
      where: {
        id: { in: input.roleIds },
        deletedAt: null,
        isActive: true
      }
    });

    if (roleCount !== input.roleIds.length) {
      throw new ApiError(400, "INVALID_ROLES", "One or more roles are invalid");
    }

    return prisma.$transaction(async (tx) => {
      const user = existingUser
        ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            passwordHash: await hashPassword(input.password),
            phone: input.phone,
            status: "ACTIVE",
            isActive: true,
            deletedAt: null,
            createdBy: existingUser.createdBy ?? actor?.id,
            updatedBy: actor?.id
          }
        })
        : await tx.user.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            passwordHash: await hashPassword(input.password),
            phone: input.phone,
            createdBy: actor?.id
          }
        });

      await tx.userRole.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false, revokedAt: new Date() }
      });

      for (const roleId of input.roleIds) {
        await tx.userRole.upsert({
          where: {
            userId_roleId: {
              userId: user.id,
              roleId
            }
          },
          update: {
            isActive: true,
            revokedAt: null
          },
          create: {
            userId: user.id,
            roleId
          }
        });
      }

      await autoAttachCreatedUserToManagedProjects(tx, user.id, input.roleIds, actor);

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: userListInclude
      });
    });
  },

  async updateUser(id: string, input: Record<string, unknown>, actor?: AuthUser) {
    if (actor && !actor.roles.includes("admin") && id === actor.id) {
      throw new ApiError(403, "SELF_USER_MANAGEMENT_FORBIDDEN", "Use the profile page to update your own account");
    }

    await this.getUserById(id, actor);

    return prisma.user.update({
      where: { id },
      data: input
    });
  },

  async softDeleteUser(id: string, actor?: AuthUser) {
    if (actor && id === actor.id) {
      throw new ApiError(403, "SELF_DELETE_FORBIDDEN", "You cannot delete your own account");
    }

    await this.getUserById(id, actor);

    return prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });
  },

  async assignRoles(userId: string, roleIds: string[], actor?: AuthUser) {
    if (actor && !actor.roles.includes("admin") && userId === actor.id) {
      throw new ApiError(403, "SELF_ROLE_ASSIGNMENT_FORBIDDEN", "You cannot change your own roles");
    }

    await this.getUserById(userId, actor);
    await assertRolesAllowed(roleIds, actor);

    const roleCount = await prisma.role.count({
      where: {
        id: { in: roleIds },
        deletedAt: null,
        isActive: true
      }
    });

    if (roleCount !== roleIds.length) {
      throw new ApiError(400, "INVALID_ROLES", "One or more roles are invalid");
    }

    return prisma.$transaction(async (tx) => {
      await tx.userRole.updateMany({
        where: { userId, isActive: true },
        data: {
          isActive: false,
          revokedAt: new Date()
        }
      });

      for (const roleId of roleIds) {
        await tx.userRole.upsert({
          where: {
            userId_roleId: {
              userId,
              roleId
            }
          },
          update: {
            isActive: true,
            revokedAt: null,
            assignedBy: actor?.id
          },
          create: {
            userId,
            roleId,
            assignedBy: actor?.id
          }
        });
      }

      await autoAttachCreatedUserToManagedProjects(tx, userId, roleIds, actor);

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: userListInclude
      });
    });
  }
};
