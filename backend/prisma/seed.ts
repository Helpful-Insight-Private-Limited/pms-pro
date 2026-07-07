import { prisma } from "../src/prisma/client.js";
import { encryptSecret } from "../src/utils/encryption.js";
import { hashPassword } from "../src/utils/password.js";

const roles = [
  { name: "Admin", slug: "admin", isSystem: true },
  { name: "Project Manager", slug: "projectManager", isSystem: true },
  { name: "Team Leader", slug: "teamLeader", isSystem: true },
  { name: "Team Member", slug: "teamMember", isSystem: true }
];

const permissions = [
  "user.create",
  "user.view",
  "user.update",
  "user.delete",
  "role.create",
  "role.view",
  "role.update",
  "role.delete",
  "permission.view",
  "permission.assign",
  "master.view",
  "master.manage",
  "system.manage",
  "system.cleanup",
  "calendar.view",
  "calendar.manage",
  "leave.view",
  "leave.manage",
  "holiday.view",
  "holiday.manage",
  "availability.view",
  "client.create",
  "client.view",
  "client.update",
  "client.delete",
  "developerProfile.manage",
  "developerRate.manage",
  "project.create",
  "project.view",
  "project.update",
  "project.delete",
  "project.assignTeam",
  "project.viewBudget",
  "project.viewCosting",
  "projectAttachment.manage",
  "projectLink.manage",
  "credential.view",
  "credential.manage",
  "milestone.create",
  "milestone.view",
  "milestone.update",
  "milestone.delete",
  "sprint.create",
  "sprint.view",
  "sprint.update",
  "sprint.delete",
  "task.create",
  "task.assign",
  "task.view",
  "task.update",
  "task.delete",
  "task.comment",
  "task.attachment.manage",
  "task.blocker.manage",
  "taskUpdate.create",
  "taskUpdate.view",
  "taskTimeLog.create",
  "taskTimeLog.view",
  "costing.view",
  "chat.view",
  "chat.message",
  "chat.group.manage",
  "notification.view",
  "notification.manage",
  "notificationTemplate.manage",
  "emailLog.view",
  "job.run",
  "job.view",
  "dashboard.view",
  "report.view",
  "report.email",
  "activityLog.view",
  "dailyReport.generate",
  "dailyReport.view"
];

const notificationTemplates = [
  {
    key: "project.assigned.in_app",
    type: "PROJECT_ASSIGNED",
    channel: "IN_APP",
    subjectTemplate: "Project assigned",
    bodyTemplate: "You have been assigned to {{projectTitle}}."
  },
  {
    key: "task.assigned.in_app",
    type: "TASK_ASSIGNED",
    channel: "IN_APP",
    subjectTemplate: "Task assigned",
    bodyTemplate: "You have been assigned task {{taskTitle}} in {{projectTitle}}."
  },
  {
    key: "task.updated.in_app",
    type: "TASK_UPDATED",
    channel: "IN_APP",
    subjectTemplate: "Task updated",
    bodyTemplate: "{{taskTitle}} was updated: {{summary}}"
  },
  {
    key: "chat.message.in_app",
    type: "CHAT_MESSAGE",
    channel: "IN_APP",
    subjectTemplate: "New message from {{senderName}}",
    bodyTemplate: "{{messagePreview}}"
  },
  {
    key: "daily.report.email",
    type: "DAILY_REPORT",
    channel: "EMAIL",
    subjectTemplate: "Daily report for {{projectTitle}}",
    bodyTemplate: "{{summary}}"
  }
] as const;

const rolePermissionMap: Record<string, string[]> = {
  admin: permissions,
  projectManager: [
    "user.create",
    "user.view",
    "user.update",
    "user.delete",
    "role.view",
    "permission.view",
    "permission.assign",
    "master.view",
    "master.manage",
    "calendar.view",
    "calendar.manage",
    "leave.view",
    "leave.manage",
    "holiday.view",
    "holiday.manage",
    "availability.view",
    "client.create",
    "client.view",
    "client.update",
    "project.create",
    "project.view",
    "project.update",
    "project.delete",
    "project.assignTeam",
    "project.viewBudget",
    "project.viewCosting",
    "projectAttachment.manage",
    "projectLink.manage",
    "credential.view",
    "credential.manage",
    "milestone.create",
    "milestone.view",
    "milestone.update",
    "milestone.delete",
    "sprint.create",
    "sprint.view",
    "sprint.update",
    "sprint.delete",
    "task.create",
    "task.assign",
    "task.view",
    "task.update",
    "task.delete",
    "task.comment",
    "task.attachment.manage",
    "task.blocker.manage",
    "taskUpdate.create",
    "taskUpdate.view",
    "taskTimeLog.create",
    "taskTimeLog.view",
    "costing.view",
    "chat.view",
    "chat.message",
    "chat.group.manage",
    "notification.view",
    "notification.manage",
    "notificationTemplate.manage",
    "emailLog.view",
    "job.run",
    "job.view",
    "dashboard.view",
    "report.view",
    "report.email",
    "activityLog.view",
    "dailyReport.generate",
    "dailyReport.view"
  ],
  teamLeader: [
    "user.view",
    "master.view",
    "calendar.view",
    "calendar.manage",
    "leave.view",
    "leave.manage",
    "holiday.view",
    "availability.view",
    "client.view",
    "project.view",
    "project.update",
    "projectAttachment.manage",
    "projectLink.manage",
    "milestone.create",
    "milestone.view",
    "milestone.update",
    "sprint.create",
    "sprint.view",
    "sprint.update",
    "task.create",
    "task.assign",
    "task.view",
    "task.update",
    "task.comment",
    "task.attachment.manage",
    "task.blocker.manage",
    "taskUpdate.create",
    "taskUpdate.view",
    "taskTimeLog.create",
    "taskTimeLog.view",
    "costing.view",
    "chat.view",
    "chat.message",
    "notification.view",
    "notification.manage",
    "emailLog.view",
    "job.view",
    "dashboard.view",
    "report.view",
    "activityLog.view",
    "dailyReport.generate",
    "dailyReport.view"
  ],
  teamMember: [
    "master.view",
    "calendar.view",
    "leave.view",
    "leave.manage",
    "holiday.view",
    "availability.view",
    "project.view",
    "milestone.view",
    "sprint.view",
    "task.view",
    "task.update",
    "task.comment",
    "task.attachment.manage",
    "task.blocker.manage",
    "taskUpdate.create",
    "taskUpdate.view",
    "taskTimeLog.create",
    "taskTimeLog.view",
    "chat.view",
    "chat.message",
    "notification.view",
    "dashboard.view"
  ]
};

const demoPassword = "ChangeMeStrong123";

const currencyMasters = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "INR", name: "Indian Rupee", symbol: "Rs" },
  { code: "EUR", name: "Euro", symbol: "EUR" },
  { code: "GBP", name: "British Pound", symbol: "GBP" }
];

const technologyStackMasters = [
  { name: "Next.js", category: "Frontend" },
  { name: "React", category: "Frontend" },
  { name: "Node.js", category: "Backend" },
  { name: "Express", category: "Backend" },
  { name: "Prisma", category: "Backend" },
  { name: "MariaDB", category: "Database" },
  { name: "MySQL", category: "Database" },
  { name: "PostgreSQL", category: "Database" },
  { name: "Tailwind CSS", category: "Frontend" },
  { name: "TypeScript", category: "Language" }
];

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function splitPermission(key: string) {
  const [module, action] = key.split(".");

  if (!module || !action) {
    throw new Error(`Invalid permission key: ${key}`);
  }

  return { module, action };
}

async function seedRoles() {
  for (const role of roles) {
    await prisma.role.upsert({
      where: { slug: role.slug },
      update: {
        name: role.name,
        isSystem: role.isSystem,
        isActive: true
      },
      create: role
    });
  }
}

async function seedPermissions() {
  for (const key of permissions) {
    const { module, action } = splitPermission(key);

    await prisma.permission.upsert({
      where: { key },
      update: {
        module,
        action,
        isSystem: true,
        isActive: true
      },
      create: {
        key,
        module,
        action,
        isSystem: true
      }
    });
  }
}

async function seedRolePermissions() {
  for (const [roleSlug, permissionKeys] of Object.entries(rolePermissionMap)) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { slug: roleSlug }
    });

    const seededPermissions = await prisma.permission.findMany({
      where: {
        key: {
          in: permissionKeys
        }
      }
    });
    const allowedPermissionIds = seededPermissions.map((permission) => permission.id);

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: {
          notIn: allowedPermissionIds
        }
      }
    });

    for (const permission of seededPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id
        }
      });
    }
  }
}

async function seedNotificationTemplates() {
  for (const template of notificationTemplates) {
    await prisma.notificationTemplate.upsert({
      where: { key: template.key },
      update: {
        type: template.type,
        channel: template.channel,
        subjectTemplate: template.subjectTemplate,
        bodyTemplate: template.bodyTemplate,
        isSystem: true,
        isActive: true,
        deletedAt: null
      },
      create: {
        ...template,
        isSystem: true
      }
    });
  }
}

async function seedMasters() {
  for (const currency of currencyMasters) {
    await prisma.currencyMaster.upsert({
      where: { code: currency.code },
      update: {
        name: currency.name,
        symbol: currency.symbol,
        isActive: true,
        deletedAt: null
      },
      create: currency
    });
  }

  for (const stack of technologyStackMasters) {
    await prisma.technologyStackMaster.upsert({
      where: { name: stack.name },
      update: {
        category: stack.category,
        isActive: true,
        deletedAt: null
      },
      create: stack
    });
  }
}

async function seedAdminUser() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const firstName = process.env.SEED_ADMIN_FIRST_NAME ?? "System";
  const lastName = process.env.SEED_ADMIN_LAST_NAME ?? "Admin";

  if (!email || !password) {
    console.warn("Skipping admin seed. SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required.");
    return;
  }

  if (password.length < 10) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 10 characters.");
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { slug: "admin" }
  });

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash: await hashPassword(password),
        status: "ACTIVE",
        isActive: true
      }
    }));

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: adminRole.id
      }
    },
    update: {
      isActive: true,
      revokedAt: null
    },
    create: {
      userId: user.id,
      roleId: adminRole.id
    }
  });
}

async function seedDemoUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleSlug: string;
}) {
  const role = await prisma.role.findUniqueOrThrow({
    where: { slug: input.roleSlug }
  });

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      status: "ACTIVE",
      isActive: true,
      deletedAt: null
    },
    create: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      passwordHash: await hashPassword(demoPassword),
      status: "ACTIVE",
      isActive: true
    }
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: role.id
      }
    },
    update: {
      isActive: true,
      revokedAt: null
    },
    create: {
      userId: user.id,
      roleId: role.id
    }
  });

  return user;
}

async function seedDeveloperProfile(input: {
  userId: string;
  designation: string;
  experienceYears: number;
  skills: string[];
  costPerHour: number;
  billingRatePerHour: number;
}) {
  await prisma.developerProfile.upsert({
    where: { userId: input.userId },
    update: {
      designation: input.designation,
      experienceYears: input.experienceYears,
      skills: input.skills,
      workingHoursPerDay: 8,
      availableHoursPerDay: 7.5,
      joiningDate: dateOnly("2024-01-15"),
      isActive: true,
      deletedAt: null
    },
    create: {
      userId: input.userId,
      designation: input.designation,
      experienceYears: input.experienceYears,
      skills: input.skills,
      workingHoursPerDay: 8,
      availableHoursPerDay: 7.5,
      joiningDate: dateOnly("2024-01-15"),
      isActive: true
    }
  });

  const existingRate = await prisma.developerRate.findFirst({
    where: {
      developerId: input.userId,
      effectiveFrom: dateOnly("2026-01-01"),
      isCurrent: true
    }
  });

  if (existingRate) {
    await prisma.developerRate.update({
      where: { id: existingRate.id },
      data: {
        costPerHour: input.costPerHour,
        billingRatePerHour: input.billingRatePerHour,
        currency: "USD",
        isActive: true,
        deletedAt: null
      }
    });
  } else {
    await prisma.developerRate.create({
      data: {
        developerId: input.userId,
        costPerHour: input.costPerHour,
        billingRatePerHour: input.billingRatePerHour,
        currency: "USD",
        effectiveFrom: dateOnly("2026-01-01"),
        isCurrent: true,
        isActive: true
      }
    });
  }
}

async function findOrCreateTask(input: {
  projectId: string;
  milestoneId: string;
  sprintId: string;
  title: string;
  description: string;
  assignedDeveloperId: string;
  reviewerId: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "TESTING" | "COMPLETED" | "BLOCKED" | "HOLD";
  estimatedHours: number;
  actualHours: number;
  storyPoints: number;
  progressPercentage: number;
  dueDate: string;
  labels: string[];
  createdBy: string;
}) {
  const existingTask = await prisma.task.findFirst({
    where: {
      projectId: input.projectId,
      title: input.title,
      deletedAt: null
    }
  });

  if (existingTask) {
    return prisma.task.update({
      where: { id: existingTask.id },
      data: {
        description: input.description,
        milestoneId: input.milestoneId,
        sprintId: input.sprintId,
        assignedDeveloperId: input.assignedDeveloperId,
        reviewerId: input.reviewerId,
        priority: input.priority,
        status: input.status,
        estimatedHours: input.estimatedHours,
        actualHours: input.actualHours,
        storyPoints: input.storyPoints,
        progressPercentage: input.progressPercentage,
        dueDate: dateOnly(input.dueDate),
        labels: input.labels,
        isActive: true,
        deletedAt: null
      }
    });
  }

  return prisma.task.create({
    data: {
      projectId: input.projectId,
      milestoneId: input.milestoneId,
      sprintId: input.sprintId,
      title: input.title,
      description: input.description,
      assignedDeveloperId: input.assignedDeveloperId,
      reviewerId: input.reviewerId,
      priority: input.priority,
      status: input.status,
      estimatedHours: input.estimatedHours,
      actualHours: input.actualHours,
      storyPoints: input.storyPoints,
      progressPercentage: input.progressPercentage,
      startDate: dateOnly("2026-07-01"),
      dueDate: dateOnly(input.dueDate),
      labels: input.labels,
      createdBy: input.createdBy
    }
  });
}

async function seedDemoData() {
  const admin = await seedDemoUser({
    firstName: "Demo",
    lastName: "Admin",
    email: "demo.admin@example.com",
    phone: "+1-555-0101",
    roleSlug: "admin"
  });
  const projectManager = await seedDemoUser({
    firstName: "Maya",
    lastName: "Manager",
    email: "demo.pm@example.com",
    phone: "+1-555-0102",
    roleSlug: "projectManager"
  });
  const teamLeader = await seedDemoUser({
    firstName: "Liam",
    lastName: "Lead",
    email: "demo.leader@example.com",
    phone: "+1-555-0103",
    roleSlug: "teamLeader"
  });
  const developer = await seedDemoUser({
    firstName: "Nora",
    lastName: "Developer",
    email: "demo.dev@example.com",
    phone: "+1-555-0104",
    roleSlug: "teamMember"
  });
  const qa = await seedDemoUser({
    firstName: "Owen",
    lastName: "QA",
    email: "demo.qa@example.com",
    phone: "+1-555-0105",
    roleSlug: "teamMember"
  });

  await seedDeveloperProfile({
    userId: projectManager.id,
    designation: "Project Manager",
    experienceYears: 8,
    skills: ["delivery", "budgeting", "stakeholder management"],
    costPerHour: 55,
    billingRatePerHour: 95
  });
  await seedDeveloperProfile({
    userId: teamLeader.id,
    designation: "Team Leader",
    experienceYears: 7,
    skills: ["architecture", "code review", "planning"],
    costPerHour: 48,
    billingRatePerHour: 85
  });
  await seedDeveloperProfile({
    userId: developer.id,
    designation: "Full Stack Developer",
    experienceYears: 4.5,
    skills: ["react", "node", "prisma", "api integration"],
    costPerHour: 34,
    billingRatePerHour: 70
  });
  await seedDeveloperProfile({
    userId: qa.id,
    designation: "QA Engineer",
    experienceYears: 3,
    skills: ["manual testing", "automation", "regression"],
    costPerHour: 28,
    billingRatePerHour: 58
  });

  const client = await prisma.client.upsert({
    where: { code: "ACME" },
    update: {
      name: "Acme Software Labs",
      contactName: "Grace Turner",
      contactEmail: "grace.turner@example.com",
      contactPhone: "+1-555-0199",
      companyWebsite: "https://example.com",
      billingAddress: "100 Market Street, New York, NY",
      notes: "Demo client for PMS testing.",
      isActive: true,
      deletedAt: null
    },
    create: {
      name: "Acme Software Labs",
      code: "ACME",
      contactName: "Grace Turner",
      contactEmail: "grace.turner@example.com",
      contactPhone: "+1-555-0199",
      companyWebsite: "https://example.com",
      billingAddress: "100 Market Street, New York, NY",
      notes: "Demo client for PMS testing.",
      createdBy: admin.id
    }
  });

  const project = await prisma.project.upsert({
    where: { code: "ACME-CRM" },
    update: {
      title: "Acme CRM Modernization",
      clientId: client.id,
      description: "Demo project with milestones, sprints, tasks, reports, credentials, links, and notifications.",
      budget: 125000,
      currency: "USD",
      startDate: dateOnly("2026-07-01"),
      endDate: dateOnly("2026-10-31"),
      status: "ACTIVE",
      technologyStack: ["Next.js", "Express", "Prisma", "MariaDB"],
      projectManagerId: projectManager.id,
      teamLeaderId: teamLeader.id,
      gitRepositoryUrl: "https://github.com/example/acme-crm",
      stagingUrl: "https://staging.example.com",
      productionUrl: "https://app.example.com",
      apiDocumentationUrl: "http://localhost:4100/api-docs",
      notes: "Seeded for frontend testing.",
      isActive: true,
      deletedAt: null
    },
    create: {
      title: "Acme CRM Modernization",
      code: "ACME-CRM",
      clientId: client.id,
      description: "Demo project with milestones, sprints, tasks, reports, credentials, links, and notifications.",
      budget: 125000,
      currency: "USD",
      startDate: dateOnly("2026-07-01"),
      endDate: dateOnly("2026-10-31"),
      status: "ACTIVE",
      technologyStack: ["Next.js", "Express", "Prisma", "MariaDB"],
      projectManagerId: projectManager.id,
      teamLeaderId: teamLeader.id,
      gitRepositoryUrl: "https://github.com/example/acme-crm",
      stagingUrl: "https://staging.example.com",
      productionUrl: "https://app.example.com",
      apiDocumentationUrl: "http://localhost:4100/api-docs",
      notes: "Seeded for frontend testing.",
      createdBy: admin.id
    }
  });

  const members = [
    { userId: projectManager.id, roleInProject: "PROJECT_MANAGER", allocationPercentage: 50 },
    { userId: teamLeader.id, roleInProject: "TEAM_LEADER", allocationPercentage: 75 },
    { userId: developer.id, roleInProject: "DEVELOPER", allocationPercentage: 100 },
    { userId: qa.id, roleInProject: "QA", allocationPercentage: 80 }
  ] as const;

  for (const member of members) {
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: member.userId
        }
      },
      update: {
        roleInProject: member.roleInProject,
        allocationPercentage: member.allocationPercentage,
        assignedDate: dateOnly("2026-07-01"),
        releasedDate: null,
        isActive: true,
        deletedAt: null
      },
      create: {
        projectId: project.id,
        userId: member.userId,
        roleInProject: member.roleInProject,
        allocationPercentage: member.allocationPercentage,
        assignedDate: dateOnly("2026-07-01"),
        createdBy: admin.id
      }
    });
  }

  const milestone = await prisma.milestone.upsert({
    where: { id: (await prisma.milestone.findFirst({ where: { projectId: project.id, title: "MVP Delivery", deletedAt: null } }))?.id ?? "new-demo-milestone" },
    update: {
      description: "Core CRM workflow and reporting delivery.",
      startDate: dateOnly("2026-07-01"),
      dueDate: dateOnly("2026-08-15"),
      responsibleUserId: teamLeader.id,
      status: "ACTIVE",
      progressPercentage: 45,
      notes: "Seeded active milestone.",
      isActive: true,
      deletedAt: null
    },
    create: {
      projectId: project.id,
      title: "MVP Delivery",
      description: "Core CRM workflow and reporting delivery.",
      startDate: dateOnly("2026-07-01"),
      dueDate: dateOnly("2026-08-15"),
      responsibleUserId: teamLeader.id,
      status: "ACTIVE",
      progressPercentage: 45,
      notes: "Seeded active milestone.",
      createdBy: admin.id
    }
  });

  const existingSprint = await prisma.sprint.findFirst({
    where: { projectId: project.id, name: "Sprint 1 - Foundation", deletedAt: null }
  });
  const sprint = existingSprint
    ? await prisma.sprint.update({
        where: { id: existingSprint.id },
        data: {
          milestoneId: milestone.id,
          goal: "Deliver base dashboard, project setup, and task workflow.",
          startDate: dateOnly("2026-07-01"),
          endDate: dateOnly("2026-07-14"),
          status: "ACTIVE",
          capacity: 160,
          velocity: 42,
          storyPoints: 34,
          progressPercentage: 55,
          isActive: true,
          deletedAt: null
        }
      })
    : await prisma.sprint.create({
        data: {
          projectId: project.id,
          milestoneId: milestone.id,
          name: "Sprint 1 - Foundation",
          goal: "Deliver base dashboard, project setup, and task workflow.",
          startDate: dateOnly("2026-07-01"),
          endDate: dateOnly("2026-07-14"),
          status: "ACTIVE",
          capacity: 160,
          velocity: 42,
          storyPoints: 34,
          progressPercentage: 55,
          createdBy: admin.id
        }
      });

  const dashboardTask = await findOrCreateTask({
    projectId: project.id,
    milestoneId: milestone.id,
    sprintId: sprint.id,
    title: "Design CRM dashboard",
    description: "Create the admin dashboard layout and KPI widgets.",
    assignedDeveloperId: developer.id,
    reviewerId: teamLeader.id,
    priority: "HIGH",
    status: "REVIEW",
    estimatedHours: 18,
    actualHours: 12,
    storyPoints: 8,
    progressPercentage: 85,
    dueDate: "2026-07-09",
    labels: ["frontend", "dashboard"],
    createdBy: teamLeader.id
  });
  const apiTask = await findOrCreateTask({
    projectId: project.id,
    milestoneId: milestone.id,
    sprintId: sprint.id,
    title: "Build role management API wiring",
    description: "Connect frontend role forms with backend role and permission APIs.",
    assignedDeveloperId: developer.id,
    reviewerId: teamLeader.id,
    priority: "CRITICAL",
    status: "IN_PROGRESS",
    estimatedHours: 22,
    actualHours: 10,
    storyPoints: 13,
    progressPercentage: 60,
    dueDate: "2026-07-11",
    labels: ["api", "rbac"],
    createdBy: teamLeader.id
  });
  const qaTask = await findOrCreateTask({
    projectId: project.id,
    milestoneId: milestone.id,
    sprintId: sprint.id,
    title: "Prepare QA checklist",
    description: "Document smoke, regression, and role based test scenarios.",
    assignedDeveloperId: qa.id,
    reviewerId: teamLeader.id,
    priority: "MEDIUM",
    status: "TODO",
    estimatedHours: 8,
    actualHours: 0,
    storyPoints: 3,
    progressPercentage: 0,
    dueDate: "2026-07-12",
    labels: ["qa", "documentation"],
    createdBy: teamLeader.id
  });
  const blockerTask = await findOrCreateTask({
    projectId: project.id,
    milestoneId: milestone.id,
    sprintId: sprint.id,
    title: "Resolve staging blocker",
    description: "Fix demo staging configuration before stakeholder review.",
    assignedDeveloperId: developer.id,
    reviewerId: teamLeader.id,
    priority: "HIGH",
    status: "BLOCKED",
    estimatedHours: 6,
    actualHours: 2,
    storyPoints: 5,
    progressPercentage: 30,
    dueDate: "2026-07-08",
    labels: ["staging", "blocker"],
    createdBy: teamLeader.id
  });

  await prisma.taskDependency.upsert({
    where: {
      taskId_dependsOnTaskId: {
        taskId: apiTask.id,
        dependsOnTaskId: dashboardTask.id
      }
    },
    update: { type: "DEPENDS_ON" },
    create: {
      taskId: apiTask.id,
      dependsOnTaskId: dashboardTask.id,
      type: "DEPENDS_ON",
      createdBy: teamLeader.id
    }
  });

  const blocker = await prisma.taskBlocker.findFirst({
    where: { taskId: blockerTask.id, description: "Waiting for staging environment variables.", deletedAt: null }
  });
  if (blocker) {
    await prisma.taskBlocker.update({
      where: { id: blocker.id },
      data: { isResolved: false, resolvedAt: null, reportedBy: developer.id }
    });
  } else {
    await prisma.taskBlocker.create({
      data: {
        taskId: blockerTask.id,
        description: "Waiting for staging environment variables.",
        isResolved: false,
        reportedBy: developer.id
      }
    });
  }

  const comment = await prisma.taskComment.findFirst({
    where: { taskId: dashboardTask.id, userId: teamLeader.id, comment: "Looks good. Please tighten the empty state copy.", deletedAt: null }
  });
  if (!comment) {
    await prisma.taskComment.create({
      data: {
        taskId: dashboardTask.id,
        userId: teamLeader.id,
        comment: "Looks good. Please tighten the empty state copy.",
        mentions: [developer.id]
      }
    });
  }

  const taskAttachment = await prisma.taskAttachment.findFirst({
    where: { taskId: dashboardTask.id, fileName: "dashboard-wireframe.png", deletedAt: null }
  });
  if (!taskAttachment) {
    await prisma.taskAttachment.create({
      data: {
        taskId: dashboardTask.id,
        fileName: "dashboard-wireframe.png",
        originalName: "dashboard-wireframe.png",
        mimeType: "image/png",
        fileSize: 248000,
        storagePath: "/demo/tasks/dashboard-wireframe.png",
        publicUrl: "https://example.com/demo/dashboard-wireframe.png",
        uploadedBy: teamLeader.id
      }
    });
  }

  const taskUpdate = await prisma.taskUpdate.findFirst({
    where: { taskId: apiTask.id, developerId: developer.id, updateDate: dateOnly("2026-07-03") }
  });
  if (!taskUpdate) {
    await prisma.taskUpdate.create({
      data: {
        taskId: apiTask.id,
        projectId: project.id,
        developerId: developer.id,
        previousStatus: "TODO",
        currentStatus: "IN_PROGRESS",
        progressPercentage: 60,
        workDoneToday: "Connected role management forms and verified permission assignment payloads.",
        planForTomorrow: "Complete project member assignment validation and report filters.",
        blockers: null,
        timeSpent: 5.5,
        updateDate: dateOnly("2026-07-03")
      }
    });
  }

  const timeLog = await prisma.taskTimeLog.findFirst({
    where: { taskId: apiTask.id, projectId: project.id, developerId: developer.id, workDate: dateOnly("2026-07-03") }
  });
  if (!timeLog) {
    await prisma.taskTimeLog.create({
      data: {
        taskId: apiTask.id,
        projectId: project.id,
        developerId: developer.id,
        workDate: dateOnly("2026-07-03"),
        hoursWorked: 5.5,
        description: "Frontend API integration and role management testing."
      }
    });
  }

  await prisma.dailyReport.upsert({
    where: {
      developerId_projectId_reportDate: {
        developerId: developer.id,
        projectId: project.id,
        reportDate: dateOnly("2026-07-03")
      }
    },
    update: {
      generatedSummary: "Nora worked on API integration and role management workflows.",
      totalTasksUpdated: 1,
      totalHoursSpent: 5.5,
      blockersSummary: "No active blocker on assigned API task.",
      tomorrowPlanSummary: "Complete project assignment forms and report filter checks."
    },
    create: {
      developerId: developer.id,
      projectId: project.id,
      reportDate: dateOnly("2026-07-03"),
      generatedSummary: "Nora worked on API integration and role management workflows.",
      totalTasksUpdated: 1,
      totalHoursSpent: 5.5,
      blockersSummary: "No active blocker on assigned API task.",
      tomorrowPlanSummary: "Complete project assignment forms and report filter checks."
    }
  });

  const projectAttachment = await prisma.projectAttachment.findFirst({
    where: { projectId: project.id, fileName: "requirements.pdf", deletedAt: null }
  });
  if (!projectAttachment) {
    await prisma.projectAttachment.create({
      data: {
        projectId: project.id,
        fileName: "requirements.pdf",
        originalName: "Acme CRM Requirements.pdf",
        mimeType: "application/pdf",
        fileSize: 512000,
        storagePath: "/demo/projects/acme-crm/requirements.pdf",
        publicUrl: "https://example.com/demo/requirements.pdf",
        description: "Seeded requirements document.",
        uploadedBy: projectManager.id,
        createdBy: projectManager.id
      }
    });
  }

  const links = [
    { title: "Git Repository", url: "https://github.com/example/acme-crm", type: "GIT" },
    { title: "Staging App", url: "https://staging.example.com", type: "STAGING" },
    { title: "API Docs", url: "http://localhost:4100/api-docs", type: "API_DOCS" }
  ] as const;
  for (const link of links) {
    const existingLink = await prisma.projectLink.findFirst({
      where: { projectId: project.id, title: link.title, deletedAt: null }
    });
    if (existingLink) {
      await prisma.projectLink.update({
        where: { id: existingLink.id },
        data: { url: link.url, type: link.type, isActive: true, deletedAt: null }
      });
    } else {
      await prisma.projectLink.create({
        data: {
          projectId: project.id,
          title: link.title,
          url: link.url,
          type: link.type,
          createdBy: projectManager.id
        }
      });
    }
  }

  const existingCredential = await prisma.projectCredential.findFirst({
    where: { projectId: project.id, title: "Staging Admin", deletedAt: null }
  });
  const encryptedCredential = encryptSecret("DemoSecret123!");
  if (existingCredential) {
    await prisma.projectCredential.update({
      where: { id: existingCredential.id },
      data: {
        type: "STAGING",
        username: "admin@example.com",
        ...encryptedCredential,
        host: "staging.example.com",
        notes: "Demo credential for reveal testing.",
        isActive: true,
        deletedAt: null
      }
    });
  } else {
    await prisma.projectCredential.create({
      data: {
        projectId: project.id,
        title: "Staging Admin",
        type: "STAGING",
        username: "admin@example.com",
        ...encryptedCredential,
        host: "staging.example.com",
        notes: "Demo credential for reveal testing.",
        createdBy: projectManager.id
      }
    });
  }

  for (const user of [admin, projectManager, teamLeader, developer, qa]) {
    for (const preference of [
      { type: "TASK_ASSIGNED", channel: "IN_APP" },
      { type: "DAILY_REPORT", channel: "EMAIL" }
    ] as const) {
      await prisma.notificationPreference.upsert({
        where: {
          userId_type_channel: {
            userId: user.id,
            type: preference.type,
            channel: preference.channel
          }
        },
        update: { isEnabled: true },
        create: {
          userId: user.id,
          type: preference.type,
          channel: preference.channel,
          isEnabled: true
        }
      });
    }
  }

  const taskAssignedTemplate = await prisma.notificationTemplate.findUnique({
    where: { key: "task.assigned.in_app" }
  });
  const existingNotification = await prisma.userNotification.findFirst({
    where: {
      userId: developer.id,
      type: "TASK_ASSIGNED",
      entityType: "task",
      entityId: apiTask.id,
      deletedAt: null
    }
  });
  if (!existingNotification) {
    await prisma.userNotification.create({
      data: {
        userId: developer.id,
        templateId: taskAssignedTemplate?.id,
        type: "TASK_ASSIGNED",
        title: "Task assigned",
        message: "You have been assigned Build role management API wiring.",
        entityType: "task",
        entityId: apiTask.id,
        metadata: { projectId: project.id }
      }
    });
  }

  const dailyReportTemplate = await prisma.notificationTemplate.findUnique({
    where: { key: "daily.report.email" }
  });
  const emailLog = await prisma.emailLog.findFirst({
    where: {
      toEmail: projectManager.email,
      subject: "Daily report for Acme CRM Modernization"
    }
  });
  if (!emailLog) {
    await prisma.emailLog.create({
      data: {
        userId: projectManager.id,
        templateId: dailyReportTemplate?.id,
        toEmail: projectManager.email,
        subject: "Daily report for Acme CRM Modernization",
        body: "Nora worked 5.5 hours on API integration and role management workflows.",
        status: "SENT",
        provider: "demo",
        providerMessageId: "demo-email-001",
        sentAt: new Date()
      }
    });
  }

  const holidays = [
    {
      name: "Independence Day",
      holidayDate: dateOnly("2026-07-04"),
      region: "US",
      description: "Seeded public holiday for availability testing."
    },
    {
      name: "Team Wellness Day",
      holidayDate: dateOnly("2026-07-17"),
      region: "Global",
      description: "Seeded company holiday for workload planning."
    }
  ];

  for (const holidayInput of holidays) {
    const existingHoliday = await prisma.holiday.findFirst({
      where: {
        holidayDate: holidayInput.holidayDate,
        region: holidayInput.region
      }
    });

    if (existingHoliday) {
      await prisma.holiday.update({
        where: { id: existingHoliday.id },
        data: {
          name: holidayInput.name,
          description: holidayInput.description,
          isActive: true,
          deletedAt: null,
          updatedBy: admin.id
        }
      });
    } else {
      await prisma.holiday.create({
        data: {
          ...holidayInput,
          createdBy: admin.id
        }
      });
    }
  }

  const existingLeave = await prisma.developerLeave.findFirst({
    where: {
      developerId: developer.id,
      startDate: dateOnly("2026-07-16"),
      endDate: dateOnly("2026-07-16")
    }
  });

  if (existingLeave) {
    await prisma.developerLeave.update({
      where: { id: existingLeave.id },
      data: {
        type: "HALF_DAY",
        status: "APPROVED",
        reason: "Seeded half-day leave for availability testing.",
        approvedBy: projectManager.id,
        approvedAt: new Date(),
        isActive: true,
        deletedAt: null,
        updatedBy: admin.id
      }
    });
  } else {
    await prisma.developerLeave.create({
      data: {
        developerId: developer.id,
        type: "HALF_DAY",
        status: "APPROVED",
        startDate: dateOnly("2026-07-16"),
        endDate: dateOnly("2026-07-16"),
        reason: "Seeded half-day leave for availability testing.",
        approvedBy: projectManager.id,
        approvedAt: new Date(),
        createdBy: developer.id
      }
    });
  }

  const existingCalendarEvent = await prisma.calendarEvent.findFirst({
    where: {
      title: "CRM stakeholder review",
      projectId: project.id,
      deletedAt: null
    }
  });

  if (existingCalendarEvent) {
    await prisma.calendarEvent.update({
      where: { id: existingCalendarEvent.id },
      data: {
        description: "Seeded milestone review meeting.",
        type: "MEETING",
        startAt: new Date("2026-07-10T15:00:00.000Z"),
        endAt: new Date("2026-07-10T16:00:00.000Z"),
        allDay: false,
        isActive: true,
        updatedBy: admin.id
      }
    });
  } else {
    await prisma.calendarEvent.create({
      data: {
        title: "CRM stakeholder review",
        description: "Seeded milestone review meeting.",
        type: "MEETING",
        startAt: new Date("2026-07-10T15:00:00.000Z"),
        endAt: new Date("2026-07-10T16:00:00.000Z"),
        allDay: false,
        projectId: project.id,
        createdBy: admin.id
      }
    });
  }

  await prisma.backgroundJobRun.upsert({
    where: { runKey: "demo-daily-summary-2026-07-03" },
    update: {
      jobName: "daily-summary",
      status: "SUCCESS",
      finishedAt: new Date(),
      summary: {
        projectId: project.id,
        reportDate: "2026-07-03",
        reportsGenerated: 1,
        emailLogsCreated: 1
      },
      errorMessage: null
    },
    create: {
      jobName: "daily-summary",
      runKey: "demo-daily-summary-2026-07-03",
      status: "SUCCESS",
      startedAt: new Date(),
      finishedAt: new Date(),
      summary: {
        projectId: project.id,
        reportDate: "2026-07-03",
        reportsGenerated: 1,
        emailLogsCreated: 1
      }
    }
  });

  const activityLog = await prisma.activityLog.findFirst({
    where: {
      action: "seed.demoDataCreated",
      module: "seed",
      entityType: "project",
      entityId: project.id
    }
  });
  if (!activityLog) {
    await prisma.activityLog.create({
      data: {
        actorId: admin.id,
        action: "seed.demoDataCreated",
        module: "seed",
        entityType: "project",
        entityId: project.id,
        projectId: project.id,
        metadata: {
          users: ["demo.admin@example.com", "demo.pm@example.com", "demo.leader@example.com", "demo.dev@example.com", "demo.qa@example.com"],
          password: demoPassword
        }
      }
    });
  }

  console.info("Demo data seeded. Demo users use password ChangeMeStrong123.");
}

async function main() {
  await seedRoles();
  await seedPermissions();
  await seedRolePermissions();
  await seedNotificationTemplates();
  await seedMasters();
  await seedAdminUser();
  await seedDemoData();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
