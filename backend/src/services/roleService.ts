import { prisma } from "../prisma/client.js";
import { roleRepository } from "../repositories/roleRepository.js";
import { ApiError } from "../utils/apiError.js";

export const roleService = {
  listRoles() {
    return roleRepository.list();
  },

  async createRole(input: { name: string; slug: string; description?: string }) {
    return prisma.role.create({
      data: input
    });
  },

  async updateRole(id: string, input: { name?: string; description?: string | null; isActive?: boolean }) {
    const role = await roleRepository.findById(id);

    if (!role || role.deletedAt) {
      throw new ApiError(404, "ROLE_NOT_FOUND", "Role not found");
    }

    if (role.isSystem && input.isActive === false) {
      throw new ApiError(400, "SYSTEM_ROLE_PROTECTED", "System roles cannot be deactivated");
    }

    return prisma.role.update({
      where: { id },
      data: input
    });
  },

  async softDeleteRole(id: string) {
    const role = await roleRepository.findById(id);

    if (!role || role.deletedAt) {
      throw new ApiError(404, "ROLE_NOT_FOUND", "Role not found");
    }

    if (role.isSystem) {
      throw new ApiError(400, "SYSTEM_ROLE_PROTECTED", "System roles cannot be deleted");
    }

    return prisma.role.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false
      }
    });
  },

  async assignPermissions(roleId: string, permissionIds: string[], assignedBy?: string) {
    const role = await roleRepository.findById(roleId);

    if (!role || role.deletedAt) {
      throw new ApiError(404, "ROLE_NOT_FOUND", "Role not found");
    }

    const permissionCount = await prisma.permission.count({
      where: {
        id: { in: permissionIds },
        deletedAt: null,
        isActive: true
      }
    });

    if (permissionCount !== permissionIds.length) {
      throw new ApiError(400, "INVALID_PERMISSIONS", "One or more permissions are invalid");
    }

    return prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: { roleId }
      });

      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
          createdBy: assignedBy
        })),
        skipDuplicates: true
      });

      return tx.role.findUniqueOrThrow({
        where: { id: roleId },
        include: {
          rolePermissions: {
            include: { permission: true }
          }
        }
      });
    });
  }
};
