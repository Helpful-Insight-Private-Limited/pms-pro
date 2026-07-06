import { prisma } from "../prisma/client.js";
import { clientRepository } from "../repositories/clientRepository.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";
import { activityLogService } from "./activityLogService.js";

type ClientInput = {
  name: string;
  code?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  companyWebsite?: string | null;
  billingAddress?: string | null;
  notes?: string | null;
  isActive?: boolean;
};

export const clientService = {
  listClients() {
    return clientRepository.list();
  },

  async getClientById(id: string) {
    const client = await clientRepository.findById(id);

    if (!client) {
      throw new ApiError(404, "CLIENT_NOT_FOUND", "Client not found");
    }

    return client;
  },

  async createClient(input: ClientInput, user: AuthUser) {
    if (input.code) {
      const existingClient = await clientRepository.findByCode(input.code);

      if (existingClient) {
        throw new ApiError(409, "CLIENT_CODE_EXISTS", "Client code already exists");
      }
    }

    const client = await prisma.client.create({
      data: {
        name: input.name,
        code: input.code,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        companyWebsite: input.companyWebsite,
        billingAddress: input.billingAddress,
        notes: input.notes,
        createdBy: user.id
      }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "client.created",
      module: "client",
      entityType: "Client",
      entityId: client.id,
      metadata: { name: client.name, code: client.code }
    });

    return this.getClientById(client.id);
  },

  async updateClient(id: string, input: ClientInput, user: AuthUser) {
    await this.getClientById(id);

    if (input.code) {
      const existingClient = await clientRepository.findByCode(input.code);

      if (existingClient && existingClient.id !== id) {
        throw new ApiError(409, "CLIENT_CODE_EXISTS", "Client code already exists");
      }
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...input,
        updatedBy: user.id
      }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "client.updated",
      module: "client",
      entityType: "Client",
      entityId: client.id,
      metadata: { changedFields: Object.keys(input), name: client.name, code: client.code }
    });

    return this.getClientById(client.id);
  },

  async softDeleteClient(id: string, user: AuthUser) {
    const client = await this.getClientById(id);
    const projectCount = await prisma.project.count({
      where: {
        clientId: id,
        deletedAt: null,
        isActive: true
      }
    });

    if (projectCount > 0) {
      throw new ApiError(409, "CLIENT_HAS_PROJECTS", "Client has active projects and cannot be deleted");
    }

    const deletedClient = await prisma.client.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedBy: user.id
      }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "client.deleted",
      module: "client",
      entityType: "Client",
      entityId: id,
      metadata: { name: client.name, code: client.code }
    });

    return deletedClient;
  }
};
