import { prisma } from "../prisma/client.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";
import { activityLogService } from "./activityLogService.js";

type CurrencyInput = {
  code?: string;
  name?: string;
  symbol?: string | null;
  isActive?: boolean;
};

type TechnologyStackInput = {
  name?: string;
  category?: string | null;
  isActive?: boolean;
};

export const masterService = {
  listCurrencies() {
    return prisma.currencyMaster.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ code: "asc" }]
    });
  },

  async createCurrency(input: Required<Pick<CurrencyInput, "code" | "name">> & CurrencyInput, user: AuthUser) {
    const existing = await prisma.currencyMaster.findUnique({ where: { code: input.code } });

    if (existing && !existing.deletedAt) {
      throw new ApiError(409, "CURRENCY_CODE_EXISTS", "Currency code already exists");
    }

    const currency = existing
      ? await prisma.currencyMaster.update({
          where: { id: existing.id },
          data: {
            name: input.name,
            symbol: input.symbol,
            isActive: true,
            deletedAt: null,
            updatedBy: user.id
          }
        })
      : await prisma.currencyMaster.create({
          data: {
            code: input.code,
            name: input.name,
            symbol: input.symbol,
            createdBy: user.id
          }
        });

    await activityLogService.create({
      actorId: user.id,
      action: "master.currencyCreated",
      module: "master",
      entityType: "CurrencyMaster",
      entityId: currency.id,
      metadata: { code: currency.code, name: currency.name }
    });

    return currency;
  },

  async updateCurrency(id: string, input: CurrencyInput, user: AuthUser) {
    const existing = await prisma.currencyMaster.findFirst({ where: { id, deletedAt: null } });

    if (!existing) {
      throw new ApiError(404, "CURRENCY_NOT_FOUND", "Currency not found");
    }

    if (input.code && input.code !== existing.code) {
      const codeOwner = await prisma.currencyMaster.findUnique({ where: { code: input.code } });
      if (codeOwner && codeOwner.id !== id && !codeOwner.deletedAt) {
        throw new ApiError(409, "CURRENCY_CODE_EXISTS", "Currency code already exists");
      }
    }

    const currency = await prisma.currencyMaster.update({
      where: { id },
      data: { ...input, updatedBy: user.id }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "master.currencyUpdated",
      module: "master",
      entityType: "CurrencyMaster",
      entityId: currency.id,
      metadata: { changedFields: Object.keys(input), code: currency.code }
    });

    return currency;
  },

  async deleteCurrency(id: string, user: AuthUser) {
    const existing = await prisma.currencyMaster.findFirst({ where: { id, deletedAt: null } });

    if (!existing) {
      throw new ApiError(404, "CURRENCY_NOT_FOUND", "Currency not found");
    }

    const currency = await prisma.currencyMaster.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: user.id }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "master.currencyDeleted",
      module: "master",
      entityType: "CurrencyMaster",
      entityId: currency.id,
      metadata: { code: currency.code }
    });

    return currency;
  },

  listTechnologyStacks() {
    return prisma.technologyStackMaster.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ name: "asc" }]
    });
  },

  async createTechnologyStack(input: Required<Pick<TechnologyStackInput, "name">> & TechnologyStackInput, user: AuthUser) {
    const existing = await prisma.technologyStackMaster.findUnique({ where: { name: input.name } });

    if (existing && !existing.deletedAt) {
      throw new ApiError(409, "TECH_STACK_EXISTS", "Technology stack already exists");
    }

    const stack = existing
      ? await prisma.technologyStackMaster.update({
          where: { id: existing.id },
          data: {
            category: input.category,
            isActive: true,
            deletedAt: null,
            updatedBy: user.id
          }
        })
      : await prisma.technologyStackMaster.create({
          data: {
            name: input.name,
            category: input.category,
            createdBy: user.id
          }
        });

    await activityLogService.create({
      actorId: user.id,
      action: "master.technologyStackCreated",
      module: "master",
      entityType: "TechnologyStackMaster",
      entityId: stack.id,
      metadata: { name: stack.name, category: stack.category }
    });

    return stack;
  },

  async updateTechnologyStack(id: string, input: TechnologyStackInput, user: AuthUser) {
    const existing = await prisma.technologyStackMaster.findFirst({ where: { id, deletedAt: null } });

    if (!existing) {
      throw new ApiError(404, "TECH_STACK_NOT_FOUND", "Technology stack not found");
    }

    if (input.name && input.name !== existing.name) {
      const nameOwner = await prisma.technologyStackMaster.findUnique({ where: { name: input.name } });
      if (nameOwner && nameOwner.id !== id && !nameOwner.deletedAt) {
        throw new ApiError(409, "TECH_STACK_EXISTS", "Technology stack already exists");
      }
    }

    const stack = await prisma.technologyStackMaster.update({
      where: { id },
      data: { ...input, updatedBy: user.id }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "master.technologyStackUpdated",
      module: "master",
      entityType: "TechnologyStackMaster",
      entityId: stack.id,
      metadata: { changedFields: Object.keys(input), name: stack.name }
    });

    return stack;
  },

  async deleteTechnologyStack(id: string, user: AuthUser) {
    const existing = await prisma.technologyStackMaster.findFirst({ where: { id, deletedAt: null } });

    if (!existing) {
      throw new ApiError(404, "TECH_STACK_NOT_FOUND", "Technology stack not found");
    }

    const stack = await prisma.technologyStackMaster.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: user.id }
    });

    await activityLogService.create({
      actorId: user.id,
      action: "master.technologyStackDeleted",
      module: "master",
      entityType: "TechnologyStackMaster",
      entityId: stack.id,
      metadata: { name: stack.name }
    });

    return stack;
  }
};
