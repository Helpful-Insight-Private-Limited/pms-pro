# Milestone 5: Project Documents, Links, and Credentials

## Status

Implemented.

## Objective

Add project attachments, project links, and encrypted project credentials.

## Backend Deliverables

- `projectAttachments` table.
- `projectLinks` table.
- `projectCredentials` table.
- Credential encryption utility.
- File upload validation.
- Role-based credential access.
- Credential audit hook points.

## Completion Criteria

- Project files can be uploaded and listed.
- Project links can be managed.
- Sensitive credentials are encrypted before storage.
- Only authorized users can view or manage credentials.

## Implemented Files

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/src/routes/projectRoutes.ts`
- `backend/src/controllers/projectAssetController.ts`
- `backend/src/services/projectAssetService.ts`
- `backend/src/repositories/projectAssetRepository.ts`
- `backend/src/validators/projectAssetValidators.ts`
- `backend/src/utils/encryption.ts`
- `backend/src/config/env.ts`

## Verification

- `npm.cmd run prisma:generate`
- `npm.cmd --workspace backend run typecheck`
- `npm.cmd --workspace backend run build`
