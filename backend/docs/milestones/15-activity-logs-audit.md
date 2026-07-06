# Milestone 15: Activity Logs and Audit

Status: Implemented

## Objective

Track important system activity.

## Backend Deliverables

- `activityLogs` table.
- Activity logging service.
- Hooks from auth, project, task, budget, and credential modules.
- Activity log APIs.

## Completion Criteria

- Important actions create activity records.
- Logs are searchable and filterable.
- Sensitive values are not stored in logs.

## Implemented Files

- `prisma/schema.prisma`
- `src/services/activityLogService.ts`
- `src/controllers/activityLogController.ts`
- `src/routes/activityLogRoutes.ts`
- `src/routes/index.ts`
- `src/controllers/authController.ts`
- `src/services/projectService.ts`
- `src/services/taskService.ts`
- `src/services/projectAssetService.ts`
- `src/services/costingService.ts`
- `src/docs/openapi.ts`
- `prisma/seed.ts`
- `frontend/src/app/activity-logs/page.tsx`
- `frontend/src/components/app-shell.tsx`

## Database

- Added `activityLogs` table.
- Added searchable indexes for actor, action, module, entity, project, task, and created date.
- Linked optional `actorId` to `users`.

## API Endpoints

- `GET /api/activity-logs`
- `GET /api/activity-logs/:id`

## Supported Filters

- `actorId`
- `action`
- `module`
- `entityType`
- `entityId`
- `projectId`
- `taskId`
- `search`
- `fromDate`
- `toDate`
- `page`
- `pageSize`

## Audit Hooks

- Auth: login, logout, logout-all, password change.
- Projects: create, update, delete, team assignment.
- Tasks: create, update, delete, comments, blockers, attachments.
- Costing: time logging and costing view.
- Credentials: create, update, delete, reveal.

## Sensitive Data Policy

- Credential secrets, encrypted values, IVs, auth tags, passwords, tokens, cookies, and authorization values are redacted by the activity log service.
- Credential audit metadata stores only non-secret identifiers such as title, type, username, host, port, project ID, and credential ID.

## Verification

- `npm.cmd --workspace backend run prisma:migrate -- --name milestone_15_activity_logs_audit`
- `npm.cmd --workspace backend run prisma:generate`
- `npm.cmd --workspace backend run typecheck`
- `npm.cmd --workspace backend run build`
- `npm.cmd --workspace backend run seed`
- `npm.cmd --workspace frontend run typecheck`
- `npm.cmd --workspace frontend run build`
