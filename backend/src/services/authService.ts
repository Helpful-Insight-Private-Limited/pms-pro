import { ApiError } from "../utils/apiError.js";
import { clearRefreshTokenCookie, readRefreshTokenCookie, setRefreshTokenCookie } from "../utils/cookies.js";
import { signAccessToken } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { generateRefreshToken, generateTokenFamilyId, hashRefreshToken } from "../utils/refreshToken.js";
import { env } from "../config/env.js";
import { authRepository } from "../repositories/authRepository.js";
import { prisma } from "../prisma/client.js";
import type { Response } from "express";
import type { AuthUser } from "../types/auth.js";

type UserWithAccess = NonNullable<Awaited<ReturnType<typeof authRepository.findUserByEmail>>>;

function ensureCanAuthenticate(user: UserWithAccess | null): asserts user is UserWithAccess {
  if (!user || user.deletedAt || !user.isActive || user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }
}

function toAuthUser(user: UserWithAccess): AuthUser {
  const activeRoles = user.userRoles
    .map((userRole) => userRole.role)
    .filter((role) => role.isActive && !role.deletedAt);

  const permissions = new Set<string>();

  for (const role of activeRoles) {
    for (const rolePermission of role.rolePermissions) {
      if (rolePermission.permission.isActive && !rolePermission.permission.deletedAt) {
        permissions.add(rolePermission.permission.key);
      }
    }
  }

  return {
    id: user.id,
    email: user.email,
    roles: activeRoles.map((role) => role.slug),
    permissions: [...permissions].sort()
  };
}

function sanitizeUser(user: UserWithAccess) {
  const authUser = toAuthUser(user);

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    status: user.status,
    roles: authUser.roles,
    permissions: authUser.permissions,
    developerProfile: user.developerProfile
  };
}

function refreshTokenExpiresAt() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.refreshTokenTtlDays);
  return expiresAt;
}

export const authService = {
  async login(input: { email: string; password: string; ipAddress?: string; userAgent?: string }, res: Response) {
    const user = await authRepository.findUserByEmail(input.email);
    ensureCanAuthenticate(user);

    const passwordMatches = await verifyPassword(user.passwordHash, input.password);

    if (!passwordMatches) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    await authRepository.updateLastLogin(user.id);

    const authUser = toAuthUser(user);
    const accessToken = await signAccessToken(authUser);
    const refreshToken = generateRefreshToken();

    await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      familyId: generateTokenFamilyId(),
      expiresAt: refreshTokenExpiresAt(),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });

    setRefreshTokenCookie(res, refreshToken);

    return {
      accessToken,
      user: sanitizeUser(user)
    };
  },

  async refresh(cookies: Record<string, unknown>, res: Response, requestMeta: { ipAddress?: string; userAgent?: string }) {
    const refreshToken = readRefreshTokenCookie(cookies);

    if (!refreshToken) {
      throw new ApiError(401, "UNAUTHORIZED", "Refresh token is required");
    }

    const tokenHash = hashRefreshToken(refreshToken);
    const tokenRecord = await authRepository.findRefreshTokenByHash(tokenHash);

    if (!tokenRecord) {
      throw new ApiError(401, "UNAUTHORIZED", "Invalid refresh token");
    }

    if (tokenRecord.revokedAt) {
      await authRepository.revokeTokenFamily(tokenRecord.familyId);
      clearRefreshTokenCookie(res);
      throw new ApiError(401, "REFRESH_TOKEN_REUSED", "Refresh token reuse detected");
    }

    if (tokenRecord.expiresAt <= new Date()) {
      await authRepository.revokeRefreshToken(tokenRecord.id);
      clearRefreshTokenCookie(res);
      throw new ApiError(401, "REFRESH_TOKEN_EXPIRED", "Refresh token expired");
    }

    const user = await authRepository.findUserById(tokenRecord.userId);
    ensureCanAuthenticate(user);

    const nextRefreshToken = generateRefreshToken();
    const nextTokenRecord = await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: hashRefreshToken(nextRefreshToken),
      familyId: tokenRecord.familyId,
      expiresAt: refreshTokenExpiresAt(),
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent
    });

    await authRepository.revokeRefreshToken(tokenRecord.id, nextTokenRecord.id);
    setRefreshTokenCookie(res, nextRefreshToken);

    return {
      accessToken: await signAccessToken(toAuthUser(user))
    };
  },

  async logout(cookies: Record<string, unknown>, res: Response) {
    const refreshToken = readRefreshTokenCookie(cookies);

    if (refreshToken) {
      const tokenRecord = await authRepository.findRefreshTokenByHash(hashRefreshToken(refreshToken));

      if (tokenRecord && !tokenRecord.revokedAt) {
        await authRepository.revokeRefreshToken(tokenRecord.id);
      }
    }

    clearRefreshTokenCookie(res);
  },

  async logoutAll(userId: string, res: Response) {
    await authRepository.revokeUserTokens(userId);
    clearRefreshTokenCookie(res);
  },

  async me(userId: string) {
    const user = await authRepository.findUserById(userId);
    ensureCanAuthenticate(user);
    return sanitizeUser(user);
  },

  async updateProfile(userId: string, input: { firstName: string; lastName?: string | null; phone?: string | null; avatarUrl?: string | null }) {
    const user = await authRepository.findUserById(userId);
    ensureCanAuthenticate(user);

    await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        avatarUrl: input.avatarUrl
      }
    });

    const updatedUser = await authRepository.findUserById(userId);
    ensureCanAuthenticate(updatedUser);
    return sanitizeUser(updatedUser);
  },

  async updateProfileAvatar(userId: string, avatarUrl: string) {
    const user = await authRepository.findUserById(userId);
    ensureCanAuthenticate(user);

    await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl }
    });

    const updatedUser = await authRepository.findUserById(userId);
    ensureCanAuthenticate(updatedUser);
    return sanitizeUser(updatedUser);
  },

  async changePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
    const user = await authRepository.findUserById(userId);
    ensureCanAuthenticate(user);

    const passwordMatches = await verifyPassword(user.passwordHash, input.currentPassword);

    if (!passwordMatches) {
      throw new ApiError(400, "INVALID_CURRENT_PASSWORD", "Current password is incorrect");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(input.newPassword)
      }
    });

    await authRepository.revokeUserTokens(userId);
  }
};
