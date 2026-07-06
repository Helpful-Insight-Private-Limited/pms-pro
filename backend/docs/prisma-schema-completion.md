# Prisma Schema Completion

## Coverage

The Prisma schema now covers the backend modules delivered through milestone 18:

- Authentication and sessions: `User`, `RefreshToken`
- RBAC: `Role`, `Permission`, `RolePermission`, `UserRole`
- Team profiles and rates: `DeveloperProfile`, `DeveloperRate`
- Clients and masters: `Client`, `CurrencyMaster`, `TechnologyStackMaster`
- Project delivery: `Project`, `ProjectMember`, `ProjectAttachment`, `ProjectLink`, `ProjectCredential`
- Planning: `Milestone`, `Sprint`, `Task`, `TaskDependency`
- Collaboration: `TaskBlocker`, `TaskComment`, `TaskAttachment`, `TaskUpdate`, `TaskTimeLog`
- Reporting and costing: `DailyReport`
- Notifications and email: `NotificationTemplate`, `UserNotification`, `NotificationPreference`, `EmailLog`
- Jobs and audit: `BackgroundJobRun`, `ActivityLog`
- Calendar and availability: `CalendarEvent`, `DeveloperLeave`, `Holiday`

## Enums

The schema includes enums for user status, project status, project member roles, project links and credentials, milestone and sprint state, task status and priority, task dependencies, notification types/channels/status, email delivery, background jobs, calendar events, leave type, and leave status.

## Relations

Core relations are represented directly in Prisma:

- Users to roles, permissions through roles, developer profiles, rates, project memberships, task ownership, leave, notifications, email logs, and activity logs.
- Projects to clients, managers, team leaders, members, assets, milestones, sprints, tasks, updates, time logs, and daily reports.
- Milestones to sprints and tasks.
- Tasks to subtasks, dependencies, comments, blockers, attachments, updates, and time logs.
- Notifications and reports back to users and projects.

## Constraints And Indexes

Unique constraints protect business identifiers including user email, role slug, permission key/module/action, client code, currency code, technology stack name, project code, project membership, task dependencies, daily report uniqueness, notification preferences, background job run keys, and holiday date/region.

Indexes are defined on common lookup and reporting fields including status, active flags, soft delete markers, project/user foreign keys, task scheduling fields, notification status, activity log search fields, calendar date ranges, leave date ranges, and holiday dates.

## Soft Delete

User-facing and operational records use `deletedAt` and/or `isActive` where the application needs reversible or auditable removal. Junction tables and immutable log tables keep narrower state fields when hard deletion or archival state is more appropriate.

## Migration Validation

The current schema generates a Prisma client successfully with:

```bash
npm.cmd --workspace backend run prisma:generate
```

Applied migrations include:

- `20260702132142_milestone_12_background_jobs`
- `20260702135233_milestone_15_activity_logs_audit`
- `20260703071849_add_currency_tech_stack_masters`
- `20260703074649_calendar_leave_availability`
