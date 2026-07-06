# Milestone 11: Notifications and Email

## Status

Implemented.

## Objective

Build in-app and email notification infrastructure.

## Backend Deliverables

- Notification templates.
- User notifications.
- Notification preferences.
- Email logs.
- Notification service.
- Email delivery service.

## Completion Criteria

- Notifications can be created from domain events.
- In-app notifications can be listed and marked read.
- Email logs record pending, sent, and failed delivery states.

## Implemented Files

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/validators/notificationValidators.ts`
- `src/repositories/notificationRepository.ts`
- `src/services/notificationService.ts`
- `src/services/emailService.ts`
- `src/controllers/notificationController.ts`
- `src/routes/notificationRoutes.ts`
- `src/routes/index.ts`
- `src/services/projectService.ts`
- `src/services/taskService.ts`
- `src/docs/openapi.ts`

## API Endpoints

- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`
- `GET /notifications/preferences`
- `PUT /notifications/preferences`
- `POST /notifications/domain-events`
- `GET /notifications/templates`
- `POST /notifications/templates`
- `PATCH /notifications/templates/:id`
- `GET /notifications/email-logs`

## Verification

- `npm.cmd run prisma:generate`
- `npm.cmd --workspace backend run typecheck`
- `npm.cmd --workspace backend run build`
