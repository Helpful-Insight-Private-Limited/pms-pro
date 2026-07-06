# Milestone 4: Project Management Core

## Status

Implemented.

## Objective

Build the core project module.

## Backend Deliverables

- `projects` table.
- `projectMembers` table.
- Project status enum.
- Project manager, team leader, and team member relationships.
- Project budget base fields.
- Project URL fields for Git, staging, production, and API docs.
- Project CRUD APIs.
- Project assignment service rules.
- Assignment notification trigger hooks.

## API Scope

- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`
- `PUT /api/projects/:id/members`

## Completion Criteria

- Project creation works.
- Project listing respects role access.
- Team assignment creates `projectMembers`.
- Assignment hooks are emitted for notification milestone.

## Implemented Files

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/src/routes/projectRoutes.ts`
- `backend/src/controllers/projectController.ts`
- `backend/src/services/projectService.ts`
- `backend/src/repositories/projectRepository.ts`
- `backend/src/validators/projectValidators.ts`
- `backend/src/routes/index.ts`

## Verification

- `npm.cmd run prisma:generate`
- `npm.cmd --workspace backend run typecheck`
- `npm.cmd --workspace backend run build`
