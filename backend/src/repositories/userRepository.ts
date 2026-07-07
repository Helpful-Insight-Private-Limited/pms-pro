import { prisma } from "../prisma/client.js";

export const userRepository = {
  list() {
    return prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
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
      }
    });
  },

  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
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
      }
    });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }
};
