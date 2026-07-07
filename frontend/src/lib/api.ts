const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

type Primitive = string | number | boolean | null | undefined;
type QueryParams = Record<string, Primitive>;

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type Id = string;

export type UserStatus = "ACTIVE" | "INVITED" | "SUSPENDED" | "DEACTIVATED";
export type ProjectStatus = "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | "DELAYED";
export type ProjectMemberRole = "PROJECT_MANAGER" | "TEAM_LEADER" | "DEVELOPER" | "REVIEWER" | "QA" | "DESIGNER" | "OBSERVER";
export type MilestoneStatus = "PENDING" | "ACTIVE" | "HOLD" | "COMPLETED" | "DELAYED";
export type SprintStatus = "PLANNING" | "ACTIVE" | "HOLD" | "COMPLETED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "TESTING" | "COMPLETED" | "BLOCKED" | "HOLD";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ProjectLinkType = "GIT" | "STAGING" | "PRODUCTION" | "API_DOCS" | "DESIGN" | "DOCUMENTATION" | "OTHER";
export type ProjectCredentialType = "SERVER" | "STAGING" | "PRODUCTION" | "API" | "DATABASE" | "GIT" | "OTHER";
export type NotificationType =
  | "SYSTEM"
  | "PROJECT_ASSIGNED"
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "TASK_COMMENT"
  | "TASK_BLOCKED"
  | "MILESTONE_DUE"
  | "SPRINT_UPDATED"
  | "DAILY_REPORT"
  | "CHAT_MESSAGE";
export type NotificationChannel = "IN_APP" | "EMAIL";
export type JobName =
  | "daily-report-generation"
  | "deadline-reminders"
  | "overdue-task-detection"
  | "delayed-milestone-detection"
  | "budget-threshold-alerts"
  | "daily-summary"
  | "weekly-summary";
export type CalendarEventType = "PROJECT" | "MILESTONE" | "SPRINT" | "TASK" | "LEAVE" | "HOLIDAY" | "MEETING" | "OTHER";
export type LeaveType = "FULL_DAY" | "HALF_DAY" | "SICK" | "CASUAL" | "VACATION" | "UNPAID";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export type AuthUser = {
  id: Id;
  firstName: string;
  lastName?: string | null;
  email: string;
  roles: string[];
  permissions: string[];
};

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  user: AuthUser;
};

export type CreateUserInput = {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  phone?: string;
  roleIds: Id[];
};

export type ClientInput = {
  name: string;
  code?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  companyWebsite?: string | null;
  billingAddress?: string | null;
  notes?: string | null;
};

export type CurrencyInput = {
  code: string;
  name: string;
  symbol?: string | null;
};

export type TechnologyStackInput = {
  name: string;
  category?: string | null;
};

export type UpdateProfileInput = {
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
};

export type UpdateUserInput = Partial<{
  firstName: string;
  lastName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  isActive: boolean;
}>;

export type CreateRoleInput = {
  name: string;
  slug: string;
  description?: string;
};

export type UpdateRoleInput = Partial<{
  name: string;
  description: string | null;
  isActive: boolean;
}>;

export type ProjectMemberInput = {
  userId: Id;
  roleInProject?: ProjectMemberRole;
  allocationPercentage?: number;
  assignedDate?: string;
  releasedDate?: string | null;
};

export type CreateProjectInput = {
  title: string;
  code: string;
  clientId: Id;
  description?: string | null;
  budget?: number;
  currency?: string;
  startDate?: string | null;
  endDate?: string | null;
  status?: ProjectStatus;
  technologyStack?: string[];
  projectManagerId: Id;
  teamLeaderId?: Id | null;
  teamMemberIds?: Id[];
  gitRepositoryUrl?: string | null;
  stagingUrl?: string | null;
  productionUrl?: string | null;
  apiDocumentationUrl?: string | null;
  notes?: string | null;
};

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, "teamMemberIds">>;

export type ProjectAttachmentInput = {
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  publicUrl?: string | null;
  description?: string | null;
};

export type ProjectLinkInput = {
  title: string;
  url: string;
  type?: ProjectLinkType;
  description?: string | null;
};

export type ProjectCredentialInput = {
  title: string;
  type?: ProjectCredentialType;
  username?: string | null;
  secret: string;
  host?: string | null;
  port?: number | null;
  notes?: string | null;
};

export type MilestoneInput = {
  title: string;
  description?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  responsibleUserId?: Id | null;
  status?: MilestoneStatus;
  progressPercentage?: number;
  notes?: string | null;
};

export type SprintInput = {
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: SprintStatus;
  capacity?: number;
  velocity?: number;
  storyPoints?: number;
  progressPercentage?: number;
};

export type TaskInput = {
  milestoneId?: Id | null;
  sprintId?: Id | null;
  parentTaskId?: Id | null;
  title: string;
  description?: string | null;
  assignedDeveloperId?: Id | null;
  reviewerId?: Id | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  estimatedHours?: number;
  actualHours?: number;
  storyPoints?: number;
  progressPercentage?: number;
  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  labels?: string[];
  dependencyTaskIds?: Id[];
};

export type TaskUpdateInput = {
  currentStatus: TaskStatus;
  progressPercentage: number;
  workDoneToday: string;
  planForTomorrow?: string | null;
  blockers?: string | null;
  timeSpent?: number;
  updateDate?: string;
};

export type TimeLogInput = {
  developerId?: Id;
  workDate?: string;
  hoursWorked: number;
  description?: string | null;
};

export type TaskTimerInput = {
  description?: string | null;
};

export type NotificationTemplateInput = {
  key: string;
  type: NotificationType;
  channel: NotificationChannel;
  subjectTemplate?: string | null;
  bodyTemplate: string;
  isActive?: boolean;
};

export type NotificationPreferenceInput = {
  type: NotificationType;
  channel: NotificationChannel;
  isEnabled: boolean;
};

export type DomainNotificationInput = {
  templateKey?: string;
  type?: NotificationType;
  userIds: Id[];
  title?: string;
  message?: string;
  entityType?: string | null;
  entityId?: Id | null;
  variables?: Record<string, string | number | boolean | null>;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
};

export type ChatUser = Pick<AuthUser, "id" | "firstName" | "lastName" | "email"> & {
  avatarUrl?: string | null;
};

export type ChatParticipant = {
  id: Id;
  threadId: Id;
  userId: Id;
  role: "OWNER" | "MEMBER";
  joinedAt: string;
  user: ChatUser;
};

export type ChatMessage = {
  id: Id;
  threadId: Id;
  senderId: Id;
  messageType: "TEXT" | "SYSTEM";
  body: string;
  createdAt: string;
  sender: ChatUser;
};

export type ChatThread = {
  id: Id;
  type: "DIRECT" | "GROUP";
  name?: string | null;
  createdBy?: Id | null;
  createdAt: string;
  updatedAt: string;
  participants: ChatParticipant[];
  messages?: ChatMessage[];
};

export type ReportFilters = Partial<{
  projectId: Id;
  clientId: Id;
  developerId: Id;
  status: string;
  fromDate: string;
  toDate: string;
}>;

export type ActivityLogFilters = Partial<{
  actorId: Id;
  action: string;
  module: string;
  entityType: string;
  entityId: Id;
  projectId: Id;
  taskId: Id;
  search: string;
  fromDate: string;
  toDate: string;
  page: number;
  pageSize: number;
}>;

export type CalendarFilters = Partial<{
  fromDate: string;
  toDate: string;
  projectId: Id;
  developerId: Id;
}>;

export type CalendarEventInput = {
  title: string;
  description?: string | null;
  type?: CalendarEventType;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  projectId?: Id | null;
  taskId?: Id | null;
};

export type DeveloperLeaveInput = {
  developerId?: Id;
  type?: LeaveType;
  status?: LeaveStatus;
  startDate: string;
  endDate: string;
  reason?: string | null;
};

export type HolidayInput = {
  name: string;
  holidayDate: string;
  region?: string | null;
  description?: string | null;
};

function buildQuery(params?: QueryParams) {
  if (!params) return "";
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

function getToken() {
  return typeof window !== "undefined" ? window.localStorage.getItem("pms.accessToken") : null;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    cache: "no-store"
  });
  const payload = (await response.json().catch(() => ({
    success: false,
    error: {
      code: "INVALID_RESPONSE",
      message: "API response could not be parsed"
    }
  }))) as ApiResponse<T>;

  if (response.status === 401 || payload.error?.code === "UNAUTHORIZED") {
    if (typeof window !== "undefined" && !path.startsWith("/auth/login")) {
      clearSession();
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/login?next=${encodeURIComponent(next)}`;
    }
    throw new Error(payload.error?.message ?? "Authentication is required");
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? payload.message ?? "API request failed");
  }

  return payload.data;
}

function get<T>(path: string, query?: QueryParams) {
  return apiRequest<T>(`${path}${buildQuery(query)}`);
}

function post<T>(path: string, body?: unknown) {
  return apiRequest<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
}

function postForm<T>(path: string, body: FormData) {
  const token = getToken();
  return fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body,
    cache: "no-store"
  }).then(async (response) => {
    const payload = (await response.json().catch(() => ({
      success: false,
      error: {
        code: "INVALID_RESPONSE",
        message: "API response could not be parsed"
      }
    }))) as ApiResponse<T>;

    if (response.status === 401 || payload.error?.code === "UNAUTHORIZED") {
      if (typeof window !== "undefined") {
        clearSession();
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/login?next=${encodeURIComponent(next)}`;
      }
      throw new Error(payload.error?.message ?? "Authentication is required");
    }

    if (!response.ok || !payload.success) {
      throw new Error(payload.error?.message ?? payload.message ?? "API request failed");
    }

    return payload.data;
  });
}

function patch<T>(path: string, body?: unknown) {
  return apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) });
}

function put<T>(path: string, body?: unknown) {
  return apiRequest<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) });
}

function del<T>(path: string) {
  return apiRequest<T>(path, { method: "DELETE" });
}

export const api = {
  auth: {
    login: (body: { email: string; password: string }) => post<LoginResponse>("/auth/login", body),
    refresh: () => post<{ accessToken: string }>("/auth/refresh"),
    logout: () => post<{ message?: string }>("/auth/logout"),
    logoutAll: () => post<{ message?: string }>("/auth/logout-all"),
    me: <T = AuthUser>() => get<T>("/auth/me"),
    updateProfile: <T = AuthUser>(body: UpdateProfileInput) => patch<T>("/auth/profile", body),
    uploadAvatar: <T = AuthUser>(body: FormData) => postForm<T>("/auth/profile/avatar", body),
    changePassword: (body: { currentPassword: string; newPassword: string }) => post<{ message?: string }>("/auth/change-password", body)
  },

  dashboards: {
    me: <T = unknown>() => get<T>("/dashboard/me"),
    admin: <T = unknown>() => get<T>("/dashboard/admin"),
    projectManager: <T = unknown>() => get<T>("/dashboard/project-manager"),
    teamLeader: <T = unknown>() => get<T>("/dashboard/team-leader"),
    teamMember: <T = unknown>() => get<T>("/dashboard/team-member")
  },

  users: {
    list: <T = unknown[]>() => get<T>("/users"),
    get: <T = unknown>(id: Id) => get<T>(`/users/${id}`),
    create: <T = unknown>(body: CreateUserInput) => post<T>("/users", body),
    update: <T = unknown>(id: Id, body: UpdateUserInput) => patch<T>(`/users/${id}`, body),
    remove: <T = unknown>(id: Id) => del<T>(`/users/${id}`),
    assignRoles: <T = unknown>(id: Id, roleIds: Id[]) => put<T>(`/users/${id}/roles`, { roleIds })
  },

  roles: {
    list: <T = unknown[]>() => get<T>("/roles"),
    create: <T = unknown>(body: CreateRoleInput) => post<T>("/roles", body),
    update: <T = unknown>(id: Id, body: UpdateRoleInput) => patch<T>(`/roles/${id}`, body),
    remove: <T = unknown>(id: Id) => del<T>(`/roles/${id}`),
    assignPermissions: <T = unknown>(id: Id, permissionIds: Id[]) => put<T>(`/roles/${id}/permissions`, { permissionIds })
  },

  permissions: {
    list: <T = unknown[]>() => get<T>("/permissions")
  },

  clients: {
    list: <T = unknown[]>() => get<T>("/clients"),
    get: <T = unknown>(id: Id) => get<T>(`/clients/${id}`),
    create: <T = unknown>(body: ClientInput) => post<T>("/clients", body),
    update: <T = unknown>(id: Id, body: Partial<ClientInput> & { isActive?: boolean }) => patch<T>(`/clients/${id}`, body),
    remove: <T = unknown>(id: Id) => del<T>(`/clients/${id}`)
  },

  masters: {
    currencies: {
      list: <T = unknown[]>() => get<T>("/masters/currencies"),
      create: <T = unknown>(body: CurrencyInput) => post<T>("/masters/currencies", body),
      update: <T = unknown>(id: Id, body: Partial<CurrencyInput> & { isActive?: boolean }) => patch<T>(`/masters/currencies/${id}`, body),
      remove: <T = unknown>(id: Id) => del<T>(`/masters/currencies/${id}`)
    },
    technologyStacks: {
      list: <T = unknown[]>() => get<T>("/masters/technology-stacks"),
      create: <T = unknown>(body: TechnologyStackInput) => post<T>("/masters/technology-stacks", body),
      update: <T = unknown>(id: Id, body: Partial<TechnologyStackInput> & { isActive?: boolean }) => patch<T>(`/masters/technology-stacks/${id}`, body),
      remove: <T = unknown>(id: Id) => del<T>(`/masters/technology-stacks/${id}`)
    }
  },

  projects: {
    list: <T = unknown[]>() => get<T>("/projects"),
    get: <T = unknown>(projectId: Id) => get<T>(`/projects/${projectId}`),
    create: <T = unknown>(body: CreateProjectInput) => post<T>("/projects", body),
    update: <T = unknown>(projectId: Id, body: UpdateProjectInput) => patch<T>(`/projects/${projectId}`, body),
    remove: <T = unknown>(projectId: Id) => del<T>(`/projects/${projectId}`),
    assignMembers: <T = unknown>(projectId: Id, members: ProjectMemberInput[]) => put<T>(`/projects/${projectId}/members`, { members }),

    attachments: {
      list: <T = unknown[]>(projectId: Id) => get<T>(`/projects/${projectId}/attachments`),
      create: <T = unknown>(projectId: Id, body: ProjectAttachmentInput) => post<T>(`/projects/${projectId}/attachments`, body),
      update: <T = unknown>(projectId: Id, attachmentId: Id, body: Partial<ProjectAttachmentInput>) =>
        patch<T>(`/projects/${projectId}/attachments/${attachmentId}`, body),
      remove: <T = unknown>(projectId: Id, attachmentId: Id) => del<T>(`/projects/${projectId}/attachments/${attachmentId}`)
    },

    links: {
      list: <T = unknown[]>(projectId: Id) => get<T>(`/projects/${projectId}/links`),
      create: <T = unknown>(projectId: Id, body: ProjectLinkInput) => post<T>(`/projects/${projectId}/links`, body),
      update: <T = unknown>(projectId: Id, linkId: Id, body: Partial<ProjectLinkInput>) => patch<T>(`/projects/${projectId}/links/${linkId}`, body),
      remove: <T = unknown>(projectId: Id, linkId: Id) => del<T>(`/projects/${projectId}/links/${linkId}`)
    },

    credentials: {
      list: <T = unknown[]>(projectId: Id) => get<T>(`/projects/${projectId}/credentials`),
      reveal: <T = unknown>(projectId: Id, credentialId: Id) => get<T>(`/projects/${projectId}/credentials/${credentialId}/reveal`),
      create: <T = unknown>(projectId: Id, body: ProjectCredentialInput) => post<T>(`/projects/${projectId}/credentials`, body),
      update: <T = unknown>(projectId: Id, credentialId: Id, body: Partial<ProjectCredentialInput>) =>
        patch<T>(`/projects/${projectId}/credentials/${credentialId}`, body),
      remove: <T = unknown>(projectId: Id, credentialId: Id) => del<T>(`/projects/${projectId}/credentials/${credentialId}`)
    },

    milestones: {
      list: <T = unknown[]>(projectId: Id) => get<T>(`/projects/${projectId}/milestones`),
      get: <T = unknown>(projectId: Id, milestoneId: Id) => get<T>(`/projects/${projectId}/milestones/${milestoneId}`),
      create: <T = unknown>(projectId: Id, body: MilestoneInput) => post<T>(`/projects/${projectId}/milestones`, body),
      update: <T = unknown>(projectId: Id, milestoneId: Id, body: Partial<MilestoneInput>) =>
        patch<T>(`/projects/${projectId}/milestones/${milestoneId}`, body),
      remove: <T = unknown>(projectId: Id, milestoneId: Id) => del<T>(`/projects/${projectId}/milestones/${milestoneId}`),
      markDelayed: <T = unknown>(projectId: Id) => post<T>(`/projects/${projectId}/milestones/mark-delayed`)
    },

    sprints: {
      list: <T = unknown[]>(projectId: Id, milestoneId: Id) => get<T>(`/projects/${projectId}/milestones/${milestoneId}/sprints`),
      get: <T = unknown>(projectId: Id, milestoneId: Id, sprintId: Id) =>
        get<T>(`/projects/${projectId}/milestones/${milestoneId}/sprints/${sprintId}`),
      create: <T = unknown>(projectId: Id, milestoneId: Id, body: SprintInput) => post<T>(`/projects/${projectId}/milestones/${milestoneId}/sprints`, body),
      update: <T = unknown>(projectId: Id, milestoneId: Id, sprintId: Id, body: Partial<SprintInput>) =>
        patch<T>(`/projects/${projectId}/milestones/${milestoneId}/sprints/${sprintId}`, body),
      remove: <T = unknown>(projectId: Id, milestoneId: Id, sprintId: Id) =>
        del<T>(`/projects/${projectId}/milestones/${milestoneId}/sprints/${sprintId}`),
      health: <T = unknown>(projectId: Id, milestoneId: Id, sprintId: Id) =>
        get<T>(`/projects/${projectId}/milestones/${milestoneId}/sprints/${sprintId}/health`)
    },

    tasks: {
      list: <T = unknown[]>(projectId: Id) => get<T>(`/projects/${projectId}/tasks`),
      get: <T = unknown>(projectId: Id, taskId: Id) => get<T>(`/projects/${projectId}/tasks/${taskId}`),
      create: <T = unknown>(projectId: Id, body: TaskInput) => post<T>(`/projects/${projectId}/tasks`, body),
      update: <T = unknown>(projectId: Id, taskId: Id, body: Partial<TaskInput>) => patch<T>(`/projects/${projectId}/tasks/${taskId}`, body),
      remove: <T = unknown>(projectId: Id, taskId: Id) => del<T>(`/projects/${projectId}/tasks/${taskId}`),
      comments: {
        list: <T = unknown[]>(projectId: Id, taskId: Id) => get<T>(`/projects/${projectId}/tasks/${taskId}/comments`),
        create: <T = unknown>(projectId: Id, taskId: Id, body: { comment: string; mentions?: Id[] }) =>
          post<T>(`/projects/${projectId}/tasks/${taskId}/comments`, { mentions: [], ...body })
      },
      blockers: {
        create: <T = unknown>(projectId: Id, taskId: Id, body: { description: string }) => post<T>(`/projects/${projectId}/tasks/${taskId}/blockers`, body),
        update: <T = unknown>(projectId: Id, taskId: Id, blockerId: Id, body: { isResolved: boolean }) =>
          patch<T>(`/projects/${projectId}/tasks/${taskId}/blockers/${blockerId}`, body)
      },
      attachments: {
        list: <T = unknown[]>(projectId: Id, taskId: Id) => get<T>(`/projects/${projectId}/tasks/${taskId}/attachments`),
        create: <T = unknown>(projectId: Id, taskId: Id, body: Omit<ProjectAttachmentInput, "description">) =>
          post<T>(`/projects/${projectId}/tasks/${taskId}/attachments`, body)
      },
      updates: {
        create: <T = unknown>(projectId: Id, taskId: Id, body: TaskUpdateInput) => post<T>(`/projects/${projectId}/tasks/${taskId}/updates`, body)
      },
      timeLogs: {
        list: <T = unknown[]>(projectId: Id, taskId: Id) => get<T>(`/projects/${projectId}/tasks/${taskId}/time-logs`),
        create: <T = unknown>(projectId: Id, taskId: Id, body: TimeLogInput) => post<T>(`/projects/${projectId}/tasks/${taskId}/time-logs`, body)
      },
      timer: {
        active: <T = unknown | null>(projectId: Id, taskId: Id) => get<T>(`/projects/${projectId}/tasks/${taskId}/timer/active`),
        start: <T = unknown>(projectId: Id, taskId: Id, body?: TaskTimerInput) => post<T>(`/projects/${projectId}/tasks/${taskId}/timer/start`, body),
        stop: <T = unknown>(projectId: Id, taskId: Id, body?: TaskTimerInput) => post<T>(`/projects/${projectId}/tasks/${taskId}/timer/stop`, body)
      }
    },

    taskUpdates: <T = unknown[]>(projectId: Id, query?: { reportDate?: string }) => get<T>(`/projects/${projectId}/task-updates`, query),
    generateDailyReports: <T = unknown>(projectId: Id, query?: { reportDate?: string }) =>
      apiRequest<T>(`/projects/${projectId}/daily-reports/generate${buildQuery(query)}`, { method: "POST", body: JSON.stringify({}) }),
    dailyReports: <T = unknown[]>(projectId: Id, query?: { reportDate?: string }) => get<T>(`/projects/${projectId}/daily-reports`, query),
    dailySummary: <T = unknown>(projectId: Id, query?: { reportDate?: string }) => get<T>(`/projects/${projectId}/daily-summary`, query),
    timeLogs: <T = unknown[]>(projectId: Id) => get<T>(`/projects/${projectId}/time-logs`),
    costing: <T = unknown>(projectId: Id) => get<T>(`/projects/${projectId}/costing`)
  },

  reports: {
    projects: <T = unknown>(query?: ReportFilters) => get<T>("/reports/projects", query),
    developers: <T = unknown>(query?: ReportFilters) => get<T>("/reports/developers", query),
    team: <T = unknown>(query?: ReportFilters) => get<T>("/reports/team", query),
    costing: <T = unknown>(query?: ReportFilters) => get<T>("/reports/costing", query),
    estimatedVsActual: <T = unknown>(query?: ReportFilters) => get<T>("/reports/estimated-vs-actual", query),
    budgetOverruns: <T = unknown>(query?: ReportFilters) => get<T>("/reports/budget-overruns", query)
  },

  notifications: {
    listMine: <T = unknown[]>() => get<T>("/notifications"),
    pushPublicKey: <T = unknown>() => get<T>("/notifications/push/public-key"),
    subscribePush: <T = unknown>(body: { endpoint: string; expirationTime?: number | null; keys: { p256dh: string; auth: string } }) =>
      post<T>("/notifications/push/subscribe", body),
    unsubscribePush: <T = unknown>(body: { endpoint: string }) => post<T>("/notifications/push/unsubscribe", body),
    markRead: <T = unknown>(id: Id) => patch<T>(`/notifications/${id}/read`),
    markAllRead: <T = unknown>() => patch<T>("/notifications/read-all"),
    preferences: {
      list: <T = unknown[]>() => get<T>("/notifications/preferences"),
      update: <T = unknown>(preferences: NotificationPreferenceInput[]) => put<T>("/notifications/preferences", { preferences })
    },
    domainEvents: {
      create: <T = unknown>(body: DomainNotificationInput) => post<T>("/notifications/domain-events", body)
    },
    templates: {
      list: <T = unknown[]>() => get<T>("/notifications/templates"),
      create: <T = unknown>(body: NotificationTemplateInput) => post<T>("/notifications/templates", body),
      update: <T = unknown>(id: Id, body: Partial<NotificationTemplateInput>) => patch<T>(`/notifications/templates/${id}`, body)
    },
    emailLogs: <T = unknown[]>() => get<T>("/notifications/email-logs")
  },

  chat: {
    users: <T = ChatUser[]>() => get<T>("/chat/users"),
    threads: <T = ChatThread[]>() => get<T>("/chat/threads"),
    createDirect: <T = ChatThread>(participantId: Id) => post<T>("/chat/direct", { participantId }),
    createGroup: <T = ChatThread>(body: { name: string; participantIds: Id[] }) => post<T>("/chat/groups", body),
    messages: <T = ChatMessage[]>(threadId: Id) => get<T>(`/chat/threads/${threadId}/messages`),
    sendMessage: <T = ChatMessage>(threadId: Id, body: { body: string }) => post<T>(`/chat/threads/${threadId}/messages`, body)
  },

  calendar: {
    events: {
      list: <T = unknown[]>(query?: CalendarFilters) => get<T>("/calendar/events", query),
      create: <T = unknown>(body: CalendarEventInput) => post<T>("/calendar/events", body),
      update: <T = unknown>(id: Id, body: Partial<CalendarEventInput> & { isActive?: boolean }) => patch<T>(`/calendar/events/${id}`, body),
      remove: <T = unknown>(id: Id) => del<T>(`/calendar/events/${id}`)
    },
    leaves: {
      list: <T = unknown[]>(query?: CalendarFilters) => get<T>("/calendar/leaves", query),
      create: <T = unknown>(body: DeveloperLeaveInput) => post<T>("/calendar/leaves", body),
      update: <T = unknown>(id: Id, body: Partial<DeveloperLeaveInput> & { isActive?: boolean }) => patch<T>(`/calendar/leaves/${id}`, body),
      remove: <T = unknown>(id: Id) => del<T>(`/calendar/leaves/${id}`)
    },
    holidays: {
      list: <T = unknown[]>(query?: CalendarFilters) => get<T>("/calendar/holidays", query),
      create: <T = unknown>(body: HolidayInput) => post<T>("/calendar/holidays", body),
      update: <T = unknown>(id: Id, body: Partial<HolidayInput> & { isActive?: boolean }) => patch<T>(`/calendar/holidays/${id}`, body),
      remove: <T = unknown>(id: Id) => del<T>(`/calendar/holidays/${id}`)
    },
    availability: <T = unknown[]>(query?: CalendarFilters) => get<T>("/calendar/availability", query),
    workload: <T = unknown[]>(query?: CalendarFilters) => get<T>("/calendar/workload", query)
  },

  jobs: {
    runs: <T = unknown[]>() => get<T>("/jobs/runs"),
    run: <T = unknown>(body?: { jobName?: JobName; date?: string }) => post<T>("/jobs/run", body)
  },

  activityLogs: {
    list: <T = unknown>(query?: ActivityLogFilters) => get<T>("/activity-logs", query),
    get: <T = unknown>(id: Id) => get<T>(`/activity-logs/${id}`)
  }
};

export function saveSession(data: LoginResponse) {
  window.localStorage.setItem("pms.accessToken", data.accessToken);
  if (data.refreshToken) window.localStorage.setItem("pms.refreshToken", data.refreshToken);
  window.localStorage.setItem("pms.user", JSON.stringify(data.user));
}

export function readSessionUser() {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem("pms.user");
  return value ? JSON.parse(value) as LoginResponse["user"] : null;
}

export function clearSession() {
  window.localStorage.removeItem("pms.accessToken");
  window.localStorage.removeItem("pms.refreshToken");
  window.localStorage.removeItem("pms.user");
}
