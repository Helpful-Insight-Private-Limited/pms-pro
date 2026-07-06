# Milestone 12: Background Jobs

## Status

Implemented.

## Objective

Add cron and background worker processing.

## Backend Deliverables

- Worker entrypoint.
- Daily report generation job.
- Deadline reminder job.
- Overdue task detection job.
- Delayed milestone detection job.
- Budget threshold alert job.
- Daily and weekly summary jobs.

## Completion Criteria

- Jobs can run separately from API process.
- Jobs are idempotent.
- Job failures are logged.

## Implemented Files

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `package.json`
- `src/worker.ts`
- `src/services/backgroundJobService.ts`
- `src/controllers/jobController.ts`
- `src/validators/jobValidators.ts`
- `src/routes/jobRoutes.ts`
- `src/routes/index.ts`
- `src/docs/openapi.ts`

## Jobs

- Daily report generation
- Deadline reminders
- Overdue task detection
- Delayed milestone detection
- Budget threshold alerts
- Daily summary
- Weekly summary

## API Endpoints

- `GET /jobs/runs`
- `POST /jobs/run`

## Commands

- `npm.cmd --workspace backend run jobs:run`
- `npm.cmd --workspace backend run worker`

## Verification

- `npm.cmd run prisma:generate`
- `npm.cmd --workspace backend run typecheck`
- `npm.cmd --workspace backend run build`
