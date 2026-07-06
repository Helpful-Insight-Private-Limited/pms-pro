# Milestone 2: Database Foundation

## Status

Started.

## Backend Deliverables

- Prisma MySQL datasource.
- User and auth foundation models.
- RBAC foundation models.
- Developer profile and developer rate models.
- Client model.
- Seed script for roles, permissions, and admin user.

## Implemented Files

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`

## Tables

- `users`
- `refreshTokens`
- `roles`
- `permissions`
- `rolePermissions`
- `userRoles`
- `developerProfiles`
- `developerRates`
- `clients`

## Completion Criteria

- `prisma generate` succeeds.
- Initial migration can create foundation tables.
- Seed script creates system roles, permissions, role-permission mapping, and admin user.
