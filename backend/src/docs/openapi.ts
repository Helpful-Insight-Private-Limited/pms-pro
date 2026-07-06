export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Project Management System API",
    version: "0.1.0",
    description: "Backend API documentation for the PMS milestones implemented so far."
  },
  servers: [
    {
      url: "http://localhost:4100",
      description: "Local development"
    }
  ],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Users" },
    { name: "Clients" },
    { name: "Masters" },
    { name: "Roles" },
    { name: "Permissions" },
    { name: "Dashboards" },
    { name: "Calendar" },
    { name: "Reports" },
    { name: "Projects" },
    { name: "Project Assets" },
    { name: "Milestones" },
    { name: "Sprints" },
    { name: "Tasks" },
    { name: "Costing" },
    { name: "Notifications" },
    { name: "Jobs" },
    { name: "Activity Logs" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      ApiSuccess: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "object" }
        }
      },
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" }
            }
          }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@example.com" },
          password: { type: "string", example: "ChangeMeStrong123" }
        }
      },
      UpdateProfileRequest: {
        type: "object",
        required: ["firstName"],
        properties: {
          firstName: { type: "string", example: "Demo" },
          lastName: { type: "string", nullable: true, example: "Admin" },
          phone: { type: "string", nullable: true, example: "+1-555-0101" },
          avatarUrl: { type: "string", format: "uri", nullable: true }
        }
      },
      ClientRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Acme Software Labs" },
          code: { type: "string", nullable: true, example: "ACME" },
          contactName: { type: "string", nullable: true },
          contactEmail: { type: "string", format: "email", nullable: true },
          contactPhone: { type: "string", nullable: true },
          companyWebsite: { type: "string", format: "uri", nullable: true },
          billingAddress: { type: "string", nullable: true },
          notes: { type: "string", nullable: true },
          isActive: { type: "boolean" }
        }
      },
      CurrencyRequest: {
        type: "object",
        required: ["code", "name"],
        properties: {
          code: { type: "string", example: "USD" },
          name: { type: "string", example: "US Dollar" },
          symbol: { type: "string", nullable: true, example: "$" },
          isActive: { type: "boolean" }
        }
      },
      TechnologyStackRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "Next.js" },
          category: { type: "string", nullable: true, example: "Frontend" },
          isActive: { type: "boolean" }
        }
      },
      ProjectRequest: {
        type: "object",
        required: ["title", "code", "clientId", "projectManagerId"],
        properties: {
          title: { type: "string" },
          code: { type: "string" },
          clientId: { type: "string" },
          description: { type: "string", nullable: true },
          budget: { type: "number", example: 100000 },
          currency: { type: "string", example: "USD" },
          startDate: { type: "string", format: "date", nullable: true },
          endDate: { type: "string", format: "date", nullable: true },
          status: { type: "string", enum: ["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED", "DELAYED"] },
          technologyStack: { type: "array", items: { type: "string" } },
          projectManagerId: { type: "string" },
          teamLeaderId: { type: "string", nullable: true },
          teamMemberIds: { type: "array", items: { type: "string" } },
          gitRepositoryUrl: { type: "string", format: "uri", nullable: true },
          stagingUrl: { type: "string", format: "uri", nullable: true },
          productionUrl: { type: "string", format: "uri", nullable: true },
          apiDocumentationUrl: { type: "string", format: "uri", nullable: true },
          notes: { type: "string", nullable: true }
        }
      },
      MilestoneRequest: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
          description: { type: "string", nullable: true },
          startDate: { type: "string", format: "date", nullable: true },
          dueDate: { type: "string", format: "date", nullable: true },
          responsibleUserId: { type: "string", nullable: true },
          status: { type: "string", enum: ["PENDING", "ACTIVE", "HOLD", "COMPLETED", "DELAYED"] },
          progressPercentage: { type: "number", minimum: 0, maximum: 100 },
          notes: { type: "string", nullable: true }
        }
      },
      SprintRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          goal: { type: "string", nullable: true },
          startDate: { type: "string", format: "date", nullable: true },
          endDate: { type: "string", format: "date", nullable: true },
          status: { type: "string", enum: ["PLANNING", "ACTIVE", "HOLD", "COMPLETED"] },
          capacity: { type: "number" },
          velocity: { type: "number" },
          storyPoints: { type: "integer" },
          progressPercentage: { type: "number", minimum: 0, maximum: 100 }
        }
      },
      TaskRequest: {
        type: "object",
        required: ["title"],
        properties: {
          milestoneId: { type: "string", nullable: true },
          sprintId: { type: "string", nullable: true },
          parentTaskId: { type: "string", nullable: true },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          assignedDeveloperId: { type: "string", nullable: true },
          reviewerId: { type: "string", nullable: true },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
          status: { type: "string", enum: ["TODO", "IN_PROGRESS", "REVIEW", "TESTING", "COMPLETED", "BLOCKED", "HOLD"] },
          estimatedHours: { type: "number" },
          actualHours: { type: "number" },
          storyPoints: { type: "integer" },
          progressPercentage: { type: "number", minimum: 0, maximum: 100 },
          startDate: { type: "string", format: "date", nullable: true },
          dueDate: { type: "string", format: "date", nullable: true },
          completedDate: { type: "string", format: "date", nullable: true },
          labels: { type: "array", items: { type: "string" } },
          dependencyTaskIds: { type: "array", items: { type: "string" } }
        }
      },
      TaskUpdateRequest: {
        type: "object",
        required: ["currentStatus", "progressPercentage", "workDoneToday"],
        properties: {
          currentStatus: { type: "string", enum: ["TODO", "IN_PROGRESS", "REVIEW", "TESTING", "COMPLETED", "BLOCKED", "HOLD"] },
          progressPercentage: { type: "number", minimum: 0, maximum: 100 },
          workDoneToday: { type: "string" },
          planForTomorrow: { type: "string", nullable: true },
          blockers: { type: "string", nullable: true },
          timeSpent: { type: "number", minimum: 0 },
          updateDate: { type: "string", format: "date", nullable: true }
        }
      },
      TaskTimeLogRequest: {
        type: "object",
        required: ["hoursWorked"],
        properties: {
          developerId: { type: "string", nullable: true, description: "Optional for managers/admins logging time for another project developer." },
          workDate: { type: "string", format: "date", nullable: true },
          hoursWorked: { type: "number", minimum: 0.01, maximum: 24 },
          description: { type: "string", nullable: true }
        }
      },
      NotificationTemplateRequest: {
        type: "object",
        required: ["key", "type", "channel", "bodyTemplate"],
        properties: {
          key: { type: "string", example: "task.assigned.in_app" },
          type: { type: "string", enum: ["SYSTEM", "PROJECT_ASSIGNED", "TASK_ASSIGNED", "TASK_UPDATED", "TASK_COMMENT", "TASK_BLOCKED", "MILESTONE_DUE", "SPRINT_UPDATED", "DAILY_REPORT", "CHAT_MESSAGE"] },
          channel: { type: "string", enum: ["IN_APP", "EMAIL"] },
          subjectTemplate: { type: "string", nullable: true },
          bodyTemplate: { type: "string" },
          isActive: { type: "boolean" }
        }
      },
      NotificationPreferencesRequest: {
        type: "object",
        required: ["preferences"],
        properties: {
          preferences: {
            type: "array",
            items: {
              type: "object",
              required: ["type", "channel", "isEnabled"],
              properties: {
                type: { type: "string", enum: ["SYSTEM", "PROJECT_ASSIGNED", "TASK_ASSIGNED", "TASK_UPDATED", "TASK_COMMENT", "TASK_BLOCKED", "MILESTONE_DUE", "SPRINT_UPDATED", "DAILY_REPORT", "CHAT_MESSAGE"] },
                channel: { type: "string", enum: ["IN_APP", "EMAIL"] },
                isEnabled: { type: "boolean" }
              }
            }
          }
        }
      },
      DomainNotificationRequest: {
        type: "object",
        required: ["userIds"],
        properties: {
          templateKey: { type: "string", nullable: true },
          type: { type: "string", enum: ["SYSTEM", "PROJECT_ASSIGNED", "TASK_ASSIGNED", "TASK_UPDATED", "TASK_COMMENT", "TASK_BLOCKED", "MILESTONE_DUE", "SPRINT_UPDATED", "DAILY_REPORT", "CHAT_MESSAGE"] },
          userIds: { type: "array", items: { type: "string" } },
          title: { type: "string", nullable: true },
          message: { type: "string", nullable: true },
          entityType: { type: "string", nullable: true },
          entityId: { type: "string", nullable: true },
          variables: { type: "object" },
          metadata: { type: "object" },
          sendEmail: { type: "boolean" }
        }
      },
      RunJobRequest: {
        type: "object",
        properties: {
          jobName: {
            type: "string",
            nullable: true,
            enum: [
              "daily-report-generation",
              "deadline-reminders",
              "overdue-task-detection",
              "delayed-milestone-detection",
              "budget-threshold-alerts",
              "daily-summary",
              "weekly-summary"
            ]
          },
          date: { type: "string", format: "date", nullable: true }
        }
      },
      CalendarEventRequest: {
        type: "object",
        required: ["title", "startAt", "endAt"],
        properties: {
          title: { type: "string", example: "Stakeholder review" },
          description: { type: "string", nullable: true },
          type: { type: "string", enum: ["PROJECT", "MILESTONE", "SPRINT", "TASK", "LEAVE", "HOLIDAY", "MEETING", "OTHER"] },
          startAt: { type: "string", format: "date-time" },
          endAt: { type: "string", format: "date-time" },
          allDay: { type: "boolean" },
          projectId: { type: "string", nullable: true },
          taskId: { type: "string", nullable: true },
          isActive: { type: "boolean" }
        }
      },
      DeveloperLeaveRequest: {
        type: "object",
        required: ["startDate", "endDate"],
        properties: {
          developerId: { type: "string", nullable: true },
          type: { type: "string", enum: ["FULL_DAY", "HALF_DAY", "SICK", "CASUAL", "VACATION", "UNPAID"] },
          status: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] },
          startDate: { type: "string", format: "date" },
          endDate: { type: "string", format: "date" },
          reason: { type: "string", nullable: true },
          isActive: { type: "boolean" }
        }
      },
      HolidayRequest: {
        type: "object",
        required: ["name", "holidayDate"],
        properties: {
          name: { type: "string", example: "Independence Day" },
          holidayDate: { type: "string", format: "date" },
          region: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          isActive: { type: "boolean" }
        }
      }
    },
    responses: {
      Unauthorized: {
        description: "Authentication is required",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } }
      },
      Forbidden: {
        description: "Permission denied",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } }
      },
      NotFound: {
        description: "Resource not found",
        content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: { "200": { description: "Service is healthy" } }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login with email and password",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } }
        },
        responses: { "200": { description: "Logged in" }, "401": { $ref: "#/components/responses/Unauthorized" } }
      }
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate refresh token",
        responses: { "200": { description: "Token refreshed" }, "401": { $ref: "#/components/responses/Unauthorized" } }
      }
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout current session",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Logged out" }, "401": { $ref: "#/components/responses/Unauthorized" } }
      }
    },
    "/auth/logout-all": {
      post: {
        tags: ["Auth"],
        summary: "Logout all sessions",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "All sessions logged out" } }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user profile",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Current user" } }
      }
    },
    "/auth/profile": {
      patch: {
        tags: ["Auth"],
        summary: "Update current user profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateProfileRequest" } } }
        },
        responses: { "200": { description: "Profile updated" } }
      }
    },
    "/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Change own password",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Password changed" } }
      }
    },
    "/users": {
      get: {
        tags: ["Users"],
        summary: "List users",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Users" } }
      },
      post: {
        tags: ["Users"],
        summary: "Create user",
        security: [{ bearerAuth: [] }],
        responses: { "201": { description: "User created" } }
      }
    },
    "/users/{id}": {
      get: { tags: ["Users"], summary: "Get user", security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/id" }], responses: { "200": { description: "User" } } },
      patch: { tags: ["Users"], summary: "Update user", security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/id" }], responses: { "200": { description: "User updated" } } },
      delete: { tags: ["Users"], summary: "Delete user", security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/id" }], responses: { "200": { description: "User deleted" } } }
    },
    "/users/{id}/roles": {
      put: { tags: ["Users"], summary: "Assign user roles", security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/id" }], responses: { "200": { description: "Roles assigned" } } }
    },
    "/roles": {
      get: { tags: ["Roles"], summary: "List roles", security: [{ bearerAuth: [] }], responses: { "200": { description: "Roles" } } },
      post: { tags: ["Roles"], summary: "Create role", security: [{ bearerAuth: [] }], responses: { "201": { description: "Role created" } } }
    },
    "/roles/{id}": {
      patch: { tags: ["Roles"], summary: "Update role", security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/id" }], responses: { "200": { description: "Role updated" } } },
      delete: { tags: ["Roles"], summary: "Delete role", security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/id" }], responses: { "200": { description: "Role deleted" } } }
    },
    "/roles/{id}/permissions": {
      put: { tags: ["Roles"], summary: "Assign role permissions", security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/id" }], responses: { "200": { description: "Permissions assigned" } } }
    },
    "/permissions": {
      get: { tags: ["Permissions"], summary: "List permissions", security: [{ bearerAuth: [] }], responses: { "200": { description: "Permissions" } } }
    },
    "/clients": {
      get: { tags: ["Clients"], summary: "List clients", security: [{ bearerAuth: [] }], responses: { "200": { description: "Clients" } } },
      post: {
        tags: ["Clients"],
        summary: "Create client",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ClientRequest" } } }
        },
        responses: { "201": { description: "Client created" } }
      }
    },
    "/clients/{id}": {
      get: { tags: ["Clients"], summary: "Get client", security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/id" }], responses: { "200": { description: "Client" } } },
      patch: {
        tags: ["Clients"],
        summary: "Update client",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/id" }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/ClientRequest" } } }
        },
        responses: { "200": { description: "Client updated" } }
      },
      delete: { tags: ["Clients"], summary: "Delete client", security: [{ bearerAuth: [] }], parameters: [{ $ref: "#/components/parameters/id" }], responses: { "200": { description: "Client deleted" } } }
    }
  }
} as const;

const pathParameters = {
  id: { name: "id", in: "path", required: true, schema: { type: "string" } },
  projectId: { name: "projectId", in: "path", required: true, schema: { type: "string" } },
  milestoneId: { name: "milestoneId", in: "path", required: true, schema: { type: "string" } },
  sprintId: { name: "sprintId", in: "path", required: true, schema: { type: "string" } },
  taskId: { name: "taskId", in: "path", required: true, schema: { type: "string" } }
};

Object.assign(openApiDocument.components, {
  parameters: pathParameters
});

function secured(method: string, tag: string, summary: string, bodyRef?: string) {
  return {
    [method]: {
      tags: [tag],
      summary,
      security: [{ bearerAuth: [] }],
      ...(bodyRef
        ? {
            requestBody: {
              required: true,
              content: { "application/json": { schema: { $ref: bodyRef } } }
            }
          }
        : {}),
      responses: {
        "200": { description: "Success" },
        "201": { description: "Created" },
        "401": { $ref: "#/components/responses/Unauthorized" },
        "403": { $ref: "#/components/responses/Forbidden" },
        "404": { $ref: "#/components/responses/NotFound" }
      }
    }
  };
}

Object.assign(openApiDocument.paths, {
  "/dashboard/me": secured("get", "Dashboards", "Get dashboard for current user's primary role"),
  "/dashboard/admin": secured("get", "Dashboards", "Get admin dashboard"),
  "/dashboard/project-manager": secured("get", "Dashboards", "Get project manager dashboard"),
  "/dashboard/team-leader": secured("get", "Dashboards", "Get team leader dashboard"),
  "/dashboard/team-member": secured("get", "Dashboards", "Get team member dashboard"),
  "/calendar/events": {
    ...secured("get", "Calendar", "List accessible calendar events, including generated project, task, leave, and holiday items"),
    ...secured("post", "Calendar", "Create manual calendar event", "#/components/schemas/CalendarEventRequest")
  },
  "/calendar/events/{id}": {
    ...secured("patch", "Calendar", "Update manual calendar event", "#/components/schemas/CalendarEventRequest"),
    ...secured("delete", "Calendar", "Delete manual calendar event")
  },
  "/calendar/leaves": {
    ...secured("get", "Calendar", "List leave requests"),
    ...secured("post", "Calendar", "Create leave request", "#/components/schemas/DeveloperLeaveRequest")
  },
  "/calendar/leaves/{id}": {
    ...secured("patch", "Calendar", "Update leave request", "#/components/schemas/DeveloperLeaveRequest"),
    ...secured("delete", "Calendar", "Delete leave request")
  },
  "/calendar/holidays": {
    ...secured("get", "Calendar", "List holidays"),
    ...secured("post", "Calendar", "Create holiday", "#/components/schemas/HolidayRequest")
  },
  "/calendar/holidays/{id}": {
    ...secured("patch", "Calendar", "Update holiday", "#/components/schemas/HolidayRequest"),
    ...secured("delete", "Calendar", "Delete holiday")
  },
  "/calendar/availability": secured("get", "Calendar", "Calculate developer availability for a date range"),
  "/calendar/workload": secured("get", "Calendar", "Calculate developer workload and utilization for a date range"),
  "/masters/currencies": {
    ...secured("get", "Masters", "List active currencies"),
    ...secured("post", "Masters", "Create currency", "#/components/schemas/CurrencyRequest")
  },
  "/masters/currencies/{id}": {
    ...secured("patch", "Masters", "Update currency", "#/components/schemas/CurrencyRequest"),
    ...secured("delete", "Masters", "Delete currency")
  },
  "/masters/technology-stacks": {
    ...secured("get", "Masters", "List active technology stacks"),
    ...secured("post", "Masters", "Create technology stack", "#/components/schemas/TechnologyStackRequest")
  },
  "/masters/technology-stacks/{id}": {
    ...secured("patch", "Masters", "Update technology stack", "#/components/schemas/TechnologyStackRequest"),
    ...secured("delete", "Masters", "Delete technology stack")
  },
  "/reports/projects": secured("get", "Reports", "Get project reports with filters"),
  "/reports/developers": secured("get", "Reports", "Get developer reports with filters"),
  "/reports/team": secured("get", "Reports", "Get team allocation reports with filters"),
  "/reports/costing": secured("get", "Reports", "Get costing reports from time logs and historical rates"),
  "/reports/estimated-vs-actual": secured("get", "Reports", "Get estimated versus actual hours and cost report"),
  "/reports/budget-overruns": secured("get", "Reports", "Get budget overrun report"),
  "/projects": {
    ...secured("get", "Projects", "List projects"),
    ...secured("post", "Projects", "Create project", "#/components/schemas/ProjectRequest")
  },
  "/projects/{projectId}": {
    ...secured("get", "Projects", "Get project"),
    ...secured("patch", "Projects", "Update project", "#/components/schemas/ProjectRequest"),
    ...secured("delete", "Projects", "Delete project")
  },
  "/projects/{projectId}/members": secured("put", "Projects", "Assign project members"),
  "/projects/{projectId}/attachments": {
    ...secured("get", "Project Assets", "List project attachments"),
    ...secured("post", "Project Assets", "Create project attachment metadata")
  },
  "/projects/{projectId}/links": {
    ...secured("get", "Project Assets", "List project links"),
    ...secured("post", "Project Assets", "Create project link")
  },
  "/projects/{projectId}/credentials": {
    ...secured("get", "Project Assets", "List project credentials without secrets"),
    ...secured("post", "Project Assets", "Create encrypted project credential")
  },
  "/projects/{projectId}/credentials/{id}/reveal": secured("get", "Project Assets", "Reveal project credential secret"),
  "/projects/{projectId}/milestones": {
    ...secured("get", "Milestones", "List milestones"),
    ...secured("post", "Milestones", "Create milestone", "#/components/schemas/MilestoneRequest")
  },
  "/projects/{projectId}/milestones/mark-delayed": secured("post", "Milestones", "Mark delayed milestones"),
  "/projects/{projectId}/milestones/{milestoneId}": {
    ...secured("get", "Milestones", "Get milestone"),
    ...secured("patch", "Milestones", "Update milestone", "#/components/schemas/MilestoneRequest"),
    ...secured("delete", "Milestones", "Delete milestone")
  },
  "/projects/{projectId}/milestones/{milestoneId}/sprints": {
    ...secured("get", "Sprints", "List sprints"),
    ...secured("post", "Sprints", "Create sprint", "#/components/schemas/SprintRequest")
  },
  "/projects/{projectId}/milestones/{milestoneId}/sprints/{sprintId}": {
    ...secured("get", "Sprints", "Get sprint"),
    ...secured("patch", "Sprints", "Update sprint", "#/components/schemas/SprintRequest"),
    ...secured("delete", "Sprints", "Delete sprint")
  },
  "/projects/{projectId}/milestones/{milestoneId}/sprints/{sprintId}/health": secured("get", "Sprints", "Get sprint health"),
  "/projects/{projectId}/tasks": {
    ...secured("get", "Tasks", "List tasks"),
    ...secured("post", "Tasks", "Create task", "#/components/schemas/TaskRequest")
  },
  "/projects/{projectId}/tasks/{taskId}": {
    ...secured("get", "Tasks", "Get task"),
    ...secured("patch", "Tasks", "Update task", "#/components/schemas/TaskRequest"),
    ...secured("delete", "Tasks", "Delete task")
  },
  "/projects/{projectId}/tasks/{taskId}/comments": {
    ...secured("get", "Tasks", "List task comments"),
    ...secured("post", "Tasks", "Add task comment")
  },
  "/projects/{projectId}/tasks/{taskId}/blockers": secured("post", "Tasks", "Add task blocker"),
  "/projects/{projectId}/tasks/{taskId}/blockers/{id}": secured("patch", "Tasks", "Resolve or reopen task blocker"),
  "/projects/{projectId}/tasks/{taskId}/attachments": {
    ...secured("get", "Tasks", "List task attachments"),
    ...secured("post", "Tasks", "Create task attachment metadata")
  },
  "/projects/{projectId}/tasks/{taskId}/updates": secured("post", "Tasks", "Create task update", "#/components/schemas/TaskUpdateRequest"),
  "/projects/{projectId}/tasks/{taskId}/time-logs": {
    ...secured("get", "Costing", "List task time logs"),
    ...secured("post", "Costing", "Log task time", "#/components/schemas/TaskTimeLogRequest")
  },
  "/projects/{projectId}/task-updates": secured("get", "Tasks", "List task updates"),
  "/projects/{projectId}/daily-reports/generate": secured("post", "Tasks", "Generate daily reports"),
  "/projects/{projectId}/daily-reports": secured("get", "Tasks", "List daily reports"),
  "/projects/{projectId}/daily-summary": secured("get", "Tasks", "Get daily project summary"),
  "/projects/{projectId}/time-logs": secured("get", "Costing", "List project time logs"),
  "/projects/{projectId}/costing": secured("get", "Costing", "Get project costing and budget summary"),
  "/notifications": secured("get", "Notifications", "List my notifications"),
  "/notifications/{id}/read": secured("patch", "Notifications", "Mark notification read"),
  "/notifications/read-all": secured("patch", "Notifications", "Mark all notifications read"),
  "/notifications/preferences": {
    ...secured("get", "Notifications", "List notification preferences"),
    ...secured("put", "Notifications", "Update notification preferences", "#/components/schemas/NotificationPreferencesRequest")
  },
  "/notifications/domain-events": secured("post", "Notifications", "Create notifications from a domain event", "#/components/schemas/DomainNotificationRequest"),
  "/notifications/templates": {
    ...secured("get", "Notifications", "List notification templates"),
    ...secured("post", "Notifications", "Create notification template", "#/components/schemas/NotificationTemplateRequest")
  },
  "/notifications/templates/{id}": secured("patch", "Notifications", "Update notification template", "#/components/schemas/NotificationTemplateRequest"),
  "/notifications/email-logs": secured("get", "Notifications", "List email logs"),
  "/jobs/runs": secured("get", "Jobs", "List background job runs"),
  "/jobs/run": secured("post", "Jobs", "Run all jobs or a selected job", "#/components/schemas/RunJobRequest"),
  "/activity-logs": secured("get", "Activity Logs", "List searchable activity logs"),
  "/activity-logs/{id}": secured("get", "Activity Logs", "Get activity log by id")
});
