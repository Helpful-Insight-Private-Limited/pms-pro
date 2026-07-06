# Milestone 8: Task and Subtask Module

## Status

Implemented.

## Objective

Swagger API Docs Tool
Build the task execution module.

## Backend Deliverables

- Swagger API Docs Tool
- `tasks` table.
- Parent task support for subtasks.
- Task status enum.
- Priority enum.
- Reviewer and assigned developer relationships.
- Task dependencies.
- Task blockers.
- Task labels.
- Task comments and attachments foundation.

## Completion Criteria

- Swagger API Docs Tool
- Tasks can be created under projects, milestones, and sprints.
- Subtasks are supported.
- Assignment and reviewer fields work.
- Status, priority, progress, and due dates are tracked.

## Implemented Files

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/src/routes/projectRoutes.ts`
- `backend/src/controllers/taskController.ts`
- `backend/src/services/taskService.ts`
- `backend/src/repositories/taskRepository.ts`
- `backend/src/validators/taskValidators.ts`
- `backend/src/docs/openapi.ts`
- `backend/src/routes/docsRoutes.ts`
- `backend/src/app.ts`

## Verification

- `npm.cmd run prisma:generate`
- `npm.cmd --workspace backend run typecheck`
- `npm.cmd --workspace backend run build`
- `http://localhost:4100/openapi.json`
- `http://localhost:4100/api-docs/`
