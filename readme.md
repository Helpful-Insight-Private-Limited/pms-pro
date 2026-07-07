Project Management System for software development companies.

Use of latest stable versions of:

Frontend:
- Next.js
- React
- TypeScript
- Tailwind CSS
- Shadcn UI

Backend:
- Node.js
- Express.js
- TypeScript
- Prisma ORM

Database:
- MySQL

Authentication:
- JWT Authentication
- Refresh Token
- Role-Based Access Control

====================================================
MAIN OBJECTIVE
====================================================

Complete production-ready architecture and MySQL database schema for this system.

The system should support:

- Project management
- Team management
- Milestones
- Sprints
- Tasks
- Subtasks
- Comments
- Attachments
- Auto-generated daily reports
- Notifications
- Email reminders
- Project costing
- Budget tracking
- Developer cost calculation
- Project credentials
- Dashboards
- Advanced reports
- Activity logs
- Calendar
- Role-based access control

Use camelCase for all column names.

Use plural table names.

Example table names:

users
roles
permissions
developerProfiles
developerRates
clients
projects
projectMembers
milestones
sprints
tasks
taskUpdates
dailyReports
taskComments
taskAttachments
notifications
activityLogs
calendarEvents

Every important table should include where applicable:

id
createdBy
updatedBy
createdAt
updatedAt
deletedAt
isActive

Use UUID or CUID-compatible IDs suitable for Prisma and MySQL.

====================================================
USER ROLES
====================================================

Admin:
- Full system access
- Manage users
- Manage roles and permissions
- Manage clients
- Manage all projects
- Manage developer rates
- View all costing reports
- Manage system settings

Project Manager:
- Create and manage projects
- Assign teams to projects
- Create milestones
- Create sprints
- View project budget
- View burned budget
- View remaining budget
- View project costing reports
- Review team progress
- Review generated daily reports
- Manage project documents and credentials

Team Leader:
- Manage assigned team
- Create and assign tasks
- Review task progress
- Review blockers
- Monitor overdue tasks
- Monitor sprint progress
- Monitor milestone progress

Team Member:
- View assigned projects
- View assigned tasks
- Update task status
- Add task comments
- Add what they completed today
- Add what they plan for tomorrow
- Add blockers
- Upload task attachments
- Update task progress

====================================================
PROJECT MODULE
====================================================

Project should support:

- Project title
- Project code
- Client
- Description
- Budget
- Currency
- Start date
- End date
- Project status
- Technology stack
- Project manager
- Team leader
- Team members
- Git repository URL
- Staging URL
- Production URL
- API documentation URL
- Requirement documents
- Project attachments
- Project credentials
- Server details
- Notes

Project status values:

Draft
Active
On Hold
Completed
Cancelled
Delayed

Sensitive project credentials must be encrypted before storage.

====================================================
PROJECT COSTING & BUDGET
====================================================

Each project dashboard should show:

- Total budget
- Estimated cost
- Actual burned budget
- Remaining budget
- Budget utilization percentage
- Estimated billing
- Actual billing
- Profit/loss
- Developer-wise cost
- Task-wise cost
- Sprint-wise cost
- Milestone-wise cost

Developer cost should NOT be stored directly in developerProfiles.

Create developerRates table:

developerRates:
- id
- developerId
- costPerHour
- billingRatePerHour
- effectiveFrom
- effectiveTo
- isCurrent
- createdAt

Cost calculation:

actualCost = taskTimeLogs.hoursWorked × developerRates.costPerHour

Billing calculation:

actualBilling = taskTimeLogs.hoursWorked × developerRates.billingRatePerHour

Project budget calculation:

remainingBudget = project.budget - actualCost

budgetUtilization = actualCost / project.budget × 100

The schema should support historical developer rate changes.

If a developer rate changes later, old project cost calculations should remain accurate.

====================================================
DEVELOPER PROFILE
====================================================

developerProfiles should include:

- userId
- designation
- experienceYears
- workingHoursPerDay
- availableHoursPerDay
- skills
- joiningDate
- notes

Use availableHoursPerDay for capacity and workload planning.

====================================================
TEAM ASSIGNMENT
====================================================

When a project is created and team members are assigned, the system should automatically send:

- In-app notification
- Email notification

Example:

"You have been assigned to Project ABC."

Project members should support:

- projectId
- userId
- roleInProject
- allocationPercentage
- assignedDate
- releasedDate

====================================================
MILESTONE MODULE
====================================================

Milestones should support:

- Project
- Title
- Description
- Start date
- Due date
- Responsible user
- Status
- Progress percentage
- Notes

Milestone status:

Pending
Active
Hold
Completed
Delayed

System should support:
- Due date reminders
- Auto-mark delayed milestones
- Dashboard notifications

====================================================
SPRINT MODULE
====================================================

Sprints should support:

- Milestone
- Sprint name
- Sprint goal
- Start date
- End date
- Status
- Capacity
- Velocity
- Story points
- Progress percentage

Sprint status:

Planning
Active
Hold
Completed

====================================================
TASK MODULE
====================================================

Tasks should support:

- Project
- Milestone
- Sprint
- Parent task
- Subtasks
- Title
- Description
- Assigned developer
- Reviewer
- Priority
- Status
- Estimated hours
- Actual hours
- Story points
- Progress percentage
- Start date
- Due date
- Completed date
- Labels
- Comments
- Attachments
- Dependencies
- Blockers

Task status:

To Do
In Progress
Review
Testing
Completed
Blocked
Hold

Priority:

Low
Medium
High
Critical

====================================================
AUTO-GENERATED DAILY REPORTS
====================================================

Team members should NOT submit separate daily reports manually.

The system should automatically generate daily reports from task updates.

Team members only update their tasks.

On each task update, team member should add:

- Work completed today
- Plan for tomorrow
- Blockers
- Progress percentage
- Status update
- Optional time spent

Create taskUpdates table:

taskUpdates:
- id
- taskId
- projectId
- developerId
- previousStatus
- currentStatus
- progressPercentage
- workDoneToday
- planForTomorrow
- blockers
- timeSpent
- updateDate
- createdAt

Create dailyReports table generated from taskUpdates:

dailyReports:
- id
- developerId
- projectId
- reportDate
- generatedSummary
- totalTasksUpdated
- totalHoursSpent
- blockersSummary
- tomorrowPlanSummary
- generatedAt
- createdAt

Project Manager and Team Leader should be able to view:

- Today’s team progress
- Developer-wise daily summary
- Project-wise daily summary
- Missing task updates
- Blockers raised today
- Tasks moved to review/testing/completed
- Tasks with no update today

====================================================
TASK TIME LOGS
====================================================

Create taskTimeLogs table:

taskTimeLogs:
- id
- taskId
- projectId
- developerId
- workDate
- hoursWorked
- description
- createdAt

This table should be used for actual cost calculation.

====================================================
NOTIFICATIONS
====================================================

System should support advanced notifications:

- Project assignment
- Team assignment
- Task assignment
- Task due today
- Task overdue
- Task overtime
- Sprint start
- Sprint end
- Milestone deadline
- Milestone delayed
- Budget threshold crossed
- Missing task updates
- Blockers added
- Comments and mentions
- Daily summary
- Weekly summary

Notification channels:

- In-app
- Email
- Future support for Slack/WhatsApp

Create notification tables required for:

- Notification templates
- User notifications
- Notification preferences
- Email logs

Use background jobs/cron jobs for:

- Deadline reminders
- Overdue task detection
- Auto-mark delayed milestones
- Missing task update reminders
- Budget threshold alerts
- Daily email summary
- Weekly project summary

====================================================
PROJECT ATTACHMENTS & CREDENTIALS
====================================================

Project should support:

- Requirement documents
- Upload files
- URLs
- Git repository
- Server details
- Staging credentials
- Production credentials
- API credentials
- Database credentials
- Notes

Sensitive credentials must be encrypted.

Create separate tables for:

projectAttachments
projectLinks
projectCredentials

====================================================
PROJECT MANAGER DAILY ROUTINE FEATURES
====================================================

Add features that make daily project management easier:

- Today’s tasks
- Overdue tasks
- Blocked tasks
- Missing task updates
- Team workload view
- Developer availability
- Sprint health
- Milestone health
- Budget health
- Upcoming deadlines
- Daily standup summary
- Auto-generated project status summary
- Risk alerts
- Pending approvals
- Recently updated tasks
- Tasks waiting for review
- Tasks ready for testing
- Budget overrun alerts

====================================================
DASHBOARDS
====================================================

Create role-specific dashboards:

Admin Dashboard:
- Total projects
- Active projects
- Delayed projects
- Total clients
- Total developers
- Total budget
- Total burned budget
- Profit/loss
- User activity

Project Manager Dashboard:
- Assigned projects
- Project health
- Budget health
- Upcoming milestones
- Active sprints
- Blocked tasks
- Missing updates
- Team workload
- Today’s summary

Team Leader Dashboard:
- Team tasks
- Sprint progress
- Overdue tasks
- Blocked tasks
- Tasks in review
- Tasks ready for testing
- Team updates

Team Member Dashboard:
- Assigned tasks
- Due today
- Overdue tasks
- Tasks in progress
- Comments and mentions
- Today’s update reminder

====================================================
REPORTING
====================================================

Schema should support:

Project Reports:
- Overall progress
- Completed vs pending tasks
- Milestone completion
- Sprint progress
- Delayed items
- Budget utilization
- Burned budget
- Remaining budget
- Profit/loss

Developer Reports:
- Tasks completed
- Hours worked
- Actual cost
- Billing amount
- Productivity
- Pending tasks
- Auto-generated daily report history

Team Reports:
- Workload distribution
- Team productivity
- Sprint velocity
- Capacity utilization

Costing Reports:
- Developer cost report
- Task cost report
- Sprint cost report
- Milestone cost report
- Project cost report
- Estimated vs actual cost report
- Budget overrun report

====================================================
ACTIVITY LOG
====================================================

Track all important activities:

- Project created
- Project updated
- Team assigned
- Milestone created
- Sprint created
- Task created
- Task assigned
- Task status changed
- Comment added
- Attachment uploaded
- Budget updated
- Credential added
- User login
- Permission changed

Create activityLogs table.

====================================================
CALENDAR
====================================================

Calendar should show:

- Project timelines
- Milestone due dates
- Sprint start/end
- Task deadlines
- Developer leave
- Holidays
- Meetings

Create calendarEvents table.

====================================================
LEAVE & AVAILABILITY
====================================================

Support:

- Developer leave
- Holidays
- Availability
- Capacity calculation
- Workload planning

====================================================
API REQUIREMENTS
====================================================

Generate REST API architecture for all modules.

For each module provide:

- Route
- Method
- Controller
- Service
- Required permission
- Request body
- Response body

Use Express.js + TypeScript clean architecture:

src/
  config/
  controllers/
  services/
  repositories/
  middlewares/
  validators/
  routes/
  utils/
  jobs/
  types/
  prisma/

====================================================
DATABASE OUTPUT FORMAT
====================================================

Generate the complete MySQL schema in Markdown.

For every table create:

# tableName

| ColumnName | DataType | Nullable | PK | FK | Default | Description |

Also provide:

- Purpose
- Relationships
- Indexes
- Unique constraints
- Foreign keys
- Prisma model

====================================================
MYSQL REQUIREMENTS
====================================================

Use MySQL-compatible data types.

Examples:

VARCHAR
TEXT
LONGTEXT
DECIMAL
INT
TINYINT
DATETIME
DATE
JSON
ENUM

Use DATETIME for timestamps.

Use DECIMAL(10,2) for rates.

Use DECIMAL(15,2) for budget fields.

Use JSON for flexible fields like skills and technologyStack.

Use UUID/CUID string IDs compatible with Prisma and MySQL.

====================================================
PRISMA REQUIREMENTS
====================================================

Generate complete Prisma schema.

Use:

provider = "mysql"

Use camelCase model fields.

Use table mapping if needed.

Use relations.

Use indexes.

Use unique constraints.

Use enum definitions.

Use soft delete support.

====================================================
PERMISSIONS
====================================================

Create RBAC permission list.

Example:

project.create
project.update
project.delete
project.view
project.assignTeam
project.viewBudget
project.viewCosting
task.create
task.assign
task.update
task.view
task.delete
developerRate.manage
report.view
credential.view
credential.manage

Generate:
- roles
- permissions
- rolePermissions
- default permission matrix

====================================================
BACKGROUND JOBS
====================================================

Design cron/background jobs for:

- Generate daily reports
- Send project assignment emails
- Send task assignment notifications
- Send deadline reminders
- Detect overdue tasks
- Detect delayed milestones
- Detect budget threshold crossing
- Send daily project manager summary
- Send weekly project summary
- Auto-update project health
- Auto-update sprint progress
- Auto-update milestone progress

====================================================
SECURITY REQUIREMENTS
====================================================

Include:

- JWT auth
- Refresh token rotation
- Password hashing
- RBAC middleware
- Input validation
- Audit logs
- Rate limiting
- CORS
- Helmet
- Encryption for project credentials
- File upload validation
- Role-based project access

====================================================
FINAL DELIVERABLES
====================================================

Provide:

1. Complete system architecture
2. Full MySQL database schema
3. Full Prisma schema
4. ER diagram using Mermaid
5. RBAC permission matrix
6. REST API module list
7. Background job list
8. Project costing calculation logic
9. Notification flow
10. Auto-generated daily report logic
11. Recommended folder structure
12. Indexing strategy
13. Seed data for roles and permissions
14. Development milestones
15. Best practices for scalability and production deployment

Enterprise SaaS application.

Do not simplify.

Production-ready.

====================================================
PRODUCTION SETUP
====================================================

Server deployment steps are documented in:

- docs/production-setup.md
