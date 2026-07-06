import { prisma } from "../prisma/client.js";
import { userRepository } from "../repositories/userRepository.js";
import { ApiError } from "../utils/apiError.js";
import { hashPassword } from "../utils/password.js";

export const userService = {
  async listUsers() {
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

    if (existingUser) {
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
      const user = await tx.user.create({
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          passwordHash: await hashPassword(input.password),
          phone: input.phone
        }
      });

      await tx.userRole.createMany({
        data: input.roleIds.map((roleId) => ({
          userId: user.id,
          roleId
        })),
        skipDuplicates: true
      });

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
