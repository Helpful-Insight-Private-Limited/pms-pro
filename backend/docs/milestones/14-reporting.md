# Milestone 14: Reporting

Status: Implemented

## Objective

Build project, developer, team, and costing reports.

## Backend Deliverables

- Project reports.
- Developer reports.
- Team reports.
- Costing reports.
- Estimated vs actual cost report.
- Budget overrun report.

## Completion Criteria

- Report APIs support filters.
- Report APIs enforce access control.
- Costing reports use time logs and historical rates.

## Implemented Files

- `src/services/advancedReportService.ts`
- `src/controllers/advancedReportController.ts`
- `src/routes/advancedReportRoutes.ts`
- `src/routes/index.ts`
- `src/docs/openapi.ts`
- `prisma/seed.ts`

## API Endpoints

- `GET /reports/projects`
- `GET /reports/developers`
- `GET /reports/team`
- `GET /reports/costing`
- `GET /reports/estimated-vs-actual`
- `GET /reports/budget-overruns`

## Supported Filters

- `projectId`
- `clientId`
- `developerId`
- `status`
- `fromDate`
- `toDate`

## Access Control

- General project, developer, and team reports require `report.view`.
- Costing, estimated-vs-actual, and budget-overrun reports require `costing.view`.
- Report data is scoped to projects accessible to the current user unless the user is an admin.

## Verification

- `npm.cmd --workspace backend run typecheck`
- `npm.cmd --workspace backend run build`
- `npm.cmd --workspace backend run seed`
