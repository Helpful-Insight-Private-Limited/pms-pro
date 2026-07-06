# Milestone 10: Time Logs and Costing

## Status

Implemented.

## Objective

Implement time tracking and project costing calculations.

## Backend Deliverables

- `taskTimeLogs` table.
- Time log APIs.
- Historical developer rate lookup.
- Actual cost calculation.
- Actual billing calculation.
- Budget utilization calculation.
- Profit/loss calculation.

## Completion Criteria

- Task time can be logged by developer.
- Cost calculations use the developer rate effective on work date.
- Project budget summary can be calculated.

## Implemented Files

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/validators/costingValidators.ts`
- `src/repositories/costingRepository.ts`
- `src/services/costingService.ts`
- `src/controllers/costingController.ts`
- `src/routes/projectRoutes.ts`
- `src/docs/openapi.ts`

## API Endpoints

- `POST /projects/:projectId/tasks/:taskId/time-logs`
- `GET /projects/:projectId/tasks/:taskId/time-logs`
- `GET /projects/:projectId/time-logs`
- `GET /projects/:projectId/costing`

## Verification

- `npm.cmd run prisma:generate`
- `npm.cmd --workspace backend run typecheck`
- `npm.cmd --workspace backend run build`
