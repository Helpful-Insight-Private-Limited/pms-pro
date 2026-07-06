import { prisma } from "../prisma/client.js";

export const projectAssetRepository = {
  listAttachments(projectId: string) {
    return prisma.projectAttachment.findMany({
      where: { projectId, deletedAt: null, isActive: true },
      orderBy: { createdAt: "desc" }
    });
  },

  findAttachment(projectId: string, id: string) {
    return prisma.projectAttachment.findFirst({
      where: { id, projectId, deletedAt: null }
    });
  },

  listLinks(projectId: string) {
    return prisma.projectLink.findMany({
      where: { projectId, deletedAt: null, isActive: true },
      orderBy: { createdAt: "desc" }
    });
  },

  findLink(projectId: string, id: string) {
    return prisma.projectLink.findFirst({
      where: { id, projectId, deletedAt: null }
    });
  },

  listCredentials(projectId: string) {
    return prisma.projectCredential.findMany({
      where: { projectId, deletedAt: null, isActive: true },
      orderBy: { createdAt: "desc" }
    });
  },

  findCredential(projectId: string, id: string) {
    return prisma.projectCredential.findFirst({
      where: { id, projectId, deletedAt: null }
    });
  }
};
