# Milestone 7: Sprint Module

## Status

Implemented.

## Objective

Build sprint planning and tracking.

## Backend Deliverables

- `sprints` table.
- Sprint status enum.
- Sprint capacity, velocity, story points, and progress.
- Sprint CRUD APIs.
- Sprint health calculation hooks.

## Completion Criteria

- Sprints can be created under milestones.
- Sprint progress can be updated.
- Sprint capacity and velocity fields are available for reporting.

## Implemented Files

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/src/routes/projectRoutes.ts`
- `backend/src/controllers/sprintController.ts`
- `backend/src/services/sprintService.ts`
- `backend/src/repositories/sprintRepository.ts`
- `backend/src/validators/sprintValidators.ts`

## Verification

- `npm.cmd run prisma:generate`
- `npm.cmd --workspace backend run typecheck`
- `npm.cmd --workspace backend run build`
- Swagger API Docs Tool
