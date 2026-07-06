import { prisma } from "../prisma/client.js";
import { projectAssetRepository } from "../repositories/projectAssetRepository.js";
import { activityLogService } from "./activityLogService.js";
import { projectService } from "./projectService.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";
import { decryptSecret, encryptSecret } from "../utils/encryption.js";

type AttachmentInput = {
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  publicUrl?: string | null;
  description?: string | null;
};

type LinkInput = {
  title: string;
  url: string;
  type: "GIT" | "STAGING" | "PRODUCTION" | "API_DOCS" | "DESIGN" | "DOCUMENTATION" | "OTHER";
  description?: string | null;
};

type CredentialInput = {
  title: string;
  type: "SERVER" | "STAGING" | "PRODUCTION" | "API" | "DATABASE" | "GIT" | "OTHER";
  username?: string | null;
  secret: string;
  host?: string | null;
  port?: number | null;
  notes?: string | null;
};

function assertCanViewCredential(user: AuthUser) {
  if (!user.roles.includes("admin") && !user.permissions.includes("credential.view") && !user.permissions.includes("credential.manage")) {
    throw new ApiError(403, "FORBIDDEN", "You do not have permission to view credentials");
  }
}

function sanitizeCredential(credential: {
  id: string;
  projectId: string;
  title: string;
  type: string;
  username: string | null;
  host: string | null;
  port: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return credential;
}

export const projectAssetService = {
  async listAttachments(projectId: string, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    return projectAssetRepository.listAttachments(projectId);
  },

  async createAttachment(projectId: string, input: AttachmentInput, user: AuthUser) {
    await projectService.getProjectById(projectId, user);

    return prisma.projectAttachment.create({
      data: {
        ...input,
        projectId,
        uploadedBy: user.id,
        createdBy: user.id
      }
    });
  },

  async updateAttachment(projectId: string, id: string, input: Partial<AttachmentInput>, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    const attachment = await projectAssetRepository.findAttachment(projectId, id);

    if (!attachment) {
      throw new ApiError(404, "PROJECT_ATTACHMENT_NOT_FOUND", "Project attachment not found");
    }

    return prisma.projectAttachment.update({
      where: { id },
      data: {
        ...input,
        updatedBy: user.id
      }
    });
  },

  async deleteAttachment(projectId: string, id: string, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    const attachment = await projectAssetRepository.findAttachment(projectId, id);

    if (!attachment) {
      throw new ApiError(404, "PROJECT_ATTACHMENT_NOT_FOUND", "Project attachment not found");
    }

    return prisma.projectAttachment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedBy: user.id
      }
    });
  },

  async listLinks(projectId: string, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    return projectAssetRepository.listLinks(projectId);
  },

  async createLink(projectId: string, input: LinkInput, user: AuthUser) {
    await projectService.getProjectById(projectId, user);

    return prisma.projectLink.create({
      data: {
        ...input,
        projectId,
        createdBy: user.id
      }
    });
  },

  async updateLink(projectId: string, id: string, input: Partial<LinkInput>, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    const link = await projectAssetRepository.findLink(projectId, id);

    if (!link) {
      throw new ApiError(404, "PROJECT_LINK_NOT_FOUND", "Project link not found");
    }

    return prisma.projectLink.update({
      where: { id },
      data: {
        ...input,
        updatedBy: user.id
      }
    });
  },

  async deleteLink(projectId: string, id: string, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    const link = await projectAssetRepository.findLink(projectId, id);

    if (!link) {
      throw new ApiError(404, "PROJECT_LINK_NOT_FOUND", "Project link not found");
    }

    return prisma.projectLink.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedBy: user.id
      }
    });
  },

  async listCredentials(projectId: string, user: AuthUser) {
    assertCanViewCredential(user);
    await projectService.getProjectById(projectId, user);
    const credentials = await projectAssetRepository.listCredentials(projectId);
    return credentials.map(sanitizeCredential);
  },

  async getCredentialSecret(projectId: string, id: string, user: AuthUser) {
    assertCanViewCredential(user);
    await projectService.getProjectById(projectId, user);
    const credential = await projectAssetRepository.findCredential(projectId, id);

    if (!credential) {
      throw new ApiError(404, "PROJECT_CREDENTIAL_NOT_FOUND", "Project credential not found");
    }

    await activityLogService.create({
      actorId: user.id,
      action: "credential.revealed",
      module: "credential",
      entityType: "ProjectCredential",
      entityId: credential.id,
      projectId,
      metadata: {
        title: credential.title,
        type: credential.type,
        username: credential.username,
        host: credential.host,
        port: credential.port
      }
    });

    return {
      ...sanitizeCredential(credential),
      secret: decryptSecret(credential)
    };
  },

  async createCredential(projectId: string, input: CredentialInput, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    const encrypted = encryptSecret(input.secret);

    const credential = await prisma.projectCredential.create({
      data: {
        projectId,
        title: input.title,
        type: input.type,
        username: input.username,
        host: input.host,
        port: input.port,
        notes: input.notes,
        ...encrypted,
        createdBy: user.id
      }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "credential.created",
      module: "credential",
      entityType: "ProjectCredential",
      entityId: credential.id,
      projectId,
      metadata: {
        title: credential.title,
        type: credential.type,
        username: credential.username,
        host: credential.host,
        port: credential.port
      }
    });

    return sanitizeCredential(credential);
  },

  async updateCredential(projectId: string, id: string, input: Partial<CredentialInput>, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    const credential = await projectAssetRepository.findCredential(projectId, id);

    if (!credential) {
      throw new ApiError(404, "PROJECT_CREDENTIAL_NOT_FOUND", "Project credential not found");
    }

    const encrypted = input.secret ? encryptSecret(input.secret) : {};

    const updatedCredential = await prisma.projectCredential.update({
      where: { id },
      data: {
        title: input.title,
        type: input.type,
        username: input.username,
        host: input.host,
        port: input.port,
        notes: input.notes,
        ...encrypted,
        updatedBy: user.id
      }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "credential.updated",
      module: "credential",
      entityType: "ProjectCredential",
      entityId: id,
      projectId,
      metadata: {
        changedFields: Object.keys(input).filter((key) => key !== "secret"),
        title: updatedCredential.title,
        type: updatedCredential.type,
        username: updatedCredential.username,
        host: updatedCredential.host,
        port: updatedCredential.port,
        secretChanged: Boolean(input.secret)
      }
    });

    return sanitizeCredential(updatedCredential);
  },

  async deleteCredential(projectId: string, id: string, user: AuthUser) {
    await projectService.getProjectById(projectId, user);
    const credential = await projectAssetRepository.findCredential(projectId, id);

    if (!credential) {
      throw new ApiError(404, "PROJECT_CREDENTIAL_NOT_FOUND", "Project credential not found");
    }

    const deletedCredential = await prisma.projectCredential.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedBy: user.id
      }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "credential.deleted",
      module: "credential",
      entityType: "ProjectCredential",
      entityId: id,
      projectId,
      metadata: {
        title: deletedCredential.title,
        type: deletedCredential.type,
        username: deletedCredential.username,
        host: deletedCredential.host,
        port: deletedCredential.port
      }
    });

    return sanitizeCredential(deletedCredential);
  }
};
