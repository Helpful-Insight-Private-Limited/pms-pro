import { prisma } from "../prisma/client.js";
import { userRepository } from "../repositories/userRepository.js";
import { ApiError } from "../utils/apiError.js";
import { hashPassword } from "../utils/password.js";
import type { AuthUser } from "../types/auth.js";

export const userService = {
  async listUsers(user: AuthUser) {
    if (user.roles.includes("admin")) {
      return userRepository.list();
    }

    const visibleUserIds = new Set<string>([user.id]);

    if (user.roles.includes("projectManager")) {
      const projects = await prisma.project.findMany({
        where: { projectManagerId: user.id, deletedAt: null, isActive: true },
        select: {
          teamLeaderId: true,
          members: { where: { deletedAt: null, isActive: true }, select: { userId: true } }
        }
      });

      for (const project of projects) {
        if (project.teamLeaderId) visibleUserIds.add(project.teamLeaderId);
        for (const member of project.members) visibleUserIds.add(member.userId);
      }
    }

    if (user.roles.includes("teamLeader")) {
      const projects = await prisma.project.findMany({
        where: { teamLeaderId: user.id, deletedAt: null, isActive: true },
        select: { members: { where: { deletedAt: null, isActive: true }, select: { userId: true } } }
      });

      for (const project of projects) {
        for (const member of project.members) visibleUserIds.add(member.userId);
      }
    }

    return prisma.user.findMany({
      where: { id: { in: [...visibleUserIds] }, deletedAt: null },
      include: {
        userRoles: {
          where: { isActive: true, revokedAt: null },
          include: { role: true }
        },
        developerProfile: true
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
    });
  },

  async listAllUsers() {
    return userRepository.list();
  },

  async getUserById(id: string) {
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
  }) {
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
            deletedAt: null
          }
        })
        : await tx.user.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            passwordHash: await hashPassword(input.password),
            phone: input.phone
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

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          userRoles: {
            where: { isActive: true, revokedAt: null },
            include: { role: true }
          }
        }
      });
    });
  },

  async updateUser(id: string, input: Record<string, unknown>) {
    await this.getUserById(id);

    return prisma.user.update({
      where: { id },
      data: input
    });
  },

  async softDeleteUser(id: string) {
    await this.getUserById(id);

    return prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });
  },

  async assignRoles(userId: string, roleIds: string[], assignedBy?: string) {
    await this.getUserById(userId);

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
            assignedBy
          },
          create: {
            userId,
            roleId,
            assignedBy
          }
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          userRoles: {
            where: { isActive: true, revokedAt: null },
            include: { role: true }
          }
        }
      });
    });
  }
};
