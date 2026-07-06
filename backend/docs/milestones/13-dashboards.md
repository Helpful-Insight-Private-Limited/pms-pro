# Milestone 13: Dashboards

## Status

Implemented.

## Objective

Expose role-specific dashboard APIs.

## Backend Deliverables

- Admin dashboard service.
- Project Manager dashboard service.
- Team Leader dashboard service.
- Team Member dashboard service.
- Dashboard query optimization.

## Completion Criteria

- Each role receives relevant dashboard data.
- Dashboard APIs enforce permission and membership checks.
- Expensive summaries are optimized or cache-ready.

## Implemented Files

- `prisma/seed.ts`
- `src/services/dashboardService.ts`
- `src/controllers/dashboardController.ts`
- `src/routes/dashboardRoutes.ts`
- `src/routes/index.ts`
- `src/docs/openapi.ts`

## API Endpoints

- `GET /dashboard/me`
- `GET /dashboard/admin`
- `GET /dashboard/project-manager`
- `GET /dashboard/team-leader`
- `GET /dashboard/team-member`

## Dashboard Data

- Project counts and status breakdowns.
- Task counts, status breakdowns, overdue tasks, and upcoming tasks.
- Open blocker counts.
- Financial summary with budget, estimated hours, actual hours, and logged hours.
- Role-specific metrics for admin, project manager, team leader, and team member.

## Verification

- `npm.cmd --workspace backend run typecheck`
- `npm.cmd --workspace backend run build`
