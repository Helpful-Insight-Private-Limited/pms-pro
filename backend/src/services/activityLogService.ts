import { prisma } from "../prisma/client.js";
import type { Prisma } from "../generated/prisma/index.js";
import type { AuthUser } from "../types/auth.js";
import { ApiError } from "../utils/apiError.js";

type ActivityLogInput = {
  actorId?: string | null;
  action: string;
  module: string;
  entityType?: string | null;
  entityId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ActivityLogFilters = {
  actorId?: string;
  action?: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  projectId?: string;
  taskId?: string;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
  page: number;
  pageSize: number;
};

const sensitiveKeys = new Set([
  "password",
  "currentPassword",
  "newPassword",
  "secret",
  "token",
  "accessToken",
  "refreshToken",
  "cookie",
  "authorization",
  "encryptedValue",
  "encryptionIv",
  "authTag"
]);

function sanitizeMetadata(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetadata(item) ?? null);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    const output: Record<string, Prisma.InputJsonValue> = {};

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (sensitiveKeys.has(key) || key.toLowerCase().includes("password") || key.toLowerCase().includes("secret")) {
        output[key] = "[REDACTED]";
        continue;
      }

      const sanitized = sanitizeMetadata(entry);
      if (sanitized !== undefined) output[key] = sanitized;
    }

    return output;
  }

  if (typeof value === "bigint") return value.toString();
  if (["string", "number", "boolean"].includes(typeof value)) return value as Prisma.InputJsonValue;

  return String(value);
}

async function scopedProjectIds(user: AuthUser) {
  if (user.roles.includes("admin")) return undefined;

  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
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
    },
    select: { id: true }
  });

  return projects.map((project) => project.id);
}

export const activityLogService = {
  async create(input: ActivityLogInput) {
    return prisma.activityLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        module: input.module,
        entityType: input.entityType,
        entityId: input.entityId,
        projectId: input.projectId,
        taskId: input.taskId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: sanitizeMetadata(input.metadata)
      }
    }).catch(() => null);
  },

  async list(user: AuthUser, filters: ActivityLogFilters) {
    const projectIds = await scopedProjectIds(user);
    const where: Prisma.ActivityLogWhereInput = {
      ...(filters.actorId ? { actorId: filters.actorId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      ...(filters.taskId ? { taskId: filters.taskId } : {}),
      ...(filters.fromDate || filters.toDate
        ? {
            createdAt: {
              ...(filters.fromDate ? { gte: filters.fromDate } : {}),
              ...(filters.toDate ? { lte: filters.toDate } : {})
            }
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { action: { contains: filters.search } },
              { module: { contains: filters.search } },
              { entityType: { contains: filters.search } },
              { entityId: { contains: filters.search } }
            ]
          }
        : {})
    };

    if (projectIds) {
      where.AND = [
        {
          OR: [
            { actorId: user.id },
            { projectId: { in: projectIds } }
          ]
        }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, email: true } }
        },
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize
      }),
      prisma.activityLog.count({ where })
    ]);

    return {
      items,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.ceil(total / filters.pageSize)
      }
    };
  },

  async getById(id: string, user: AuthUser) {
    const projectIds = await scopedProjectIds(user);
    const log = await prisma.activityLog.findFirst({
      where: {
        id,
        ...(projectIds
          ? {
              OR: [
                { actorId: user.id },
                { projectId: { in: projectIds } }
              ]
            }
          : {})
      },
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    if (!log) {
      throw new ApiError(404, "ACTIVITY_LOG_NOT_FOUND", "Activity log not found");
    }

    return log;
  }
};
