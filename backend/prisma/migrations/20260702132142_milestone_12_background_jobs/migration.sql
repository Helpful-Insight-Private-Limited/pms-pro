-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `avatarUrl` VARCHAR(500) NULL,
    `status` ENUM('ACTIVE', 'INVITED', 'SUSPENDED', 'DEACTIVATED') NOT NULL DEFAULT 'ACTIVE',
    `emailVerifiedAt` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_status_idx`(`status`),
    INDEX `users_isActive_idx`(`isActive`),
    INDEX `users_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refreshTokens` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(255) NOT NULL,
    `familyId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `replacedByTokenId` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refreshTokens_tokenHash_key`(`tokenHash`),
    INDEX `refreshTokens_userId_idx`(`userId`),
    INDEX `refreshTokens_familyId_idx`(`familyId`),
    INDEX `refreshTokens_expiresAt_idx`(`expiresAt`),
    INDEX `refreshTokens_revokedAt_idx`(`revokedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `roles_slug_key`(`slug`),
    INDEX `roles_isSystem_idx`(`isSystem`),
    INDEX `roles_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `module` VARCHAR(100) NOT NULL,
    `action` VARCHAR(100) NOT NULL,
    `key` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `permissions_key_key`(`key`),
    INDEX `permissions_module_idx`(`module`),
    INDEX `permissions_action_idx`(`action`),
    INDEX `permissions_isActive_idx`(`isActive`),
    UNIQUE INDEX `permissions_module_action_key`(`module`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rolePermissions` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rolePermissions_roleId_idx`(`roleId`),
    INDEX `rolePermissions_permissionId_idx`(`permissionId`),
    UNIQUE INDEX `rolePermissions_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `userRoles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `assignedBy` VARCHAR(191) NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `userRoles_userId_idx`(`userId`),
    INDEX `userRoles_roleId_idx`(`roleId`),
    INDEX `userRoles_isActive_idx`(`isActive`),
    UNIQUE INDEX `userRoles_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `developerProfiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `designation` VARCHAR(150) NULL,
    `experienceYears` DECIMAL(4, 1) NULL,
    `workingHoursPerDay` DECIMAL(4, 2) NOT NULL DEFAULT 8.00,
    `availableHoursPerDay` DECIMAL(4, 2) NOT NULL DEFAULT 8.00,
    `skills` JSON NULL,
    `joiningDate` DATE NULL,
    `notes` TEXT NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `developerProfiles_userId_key`(`userId`),
    INDEX `developerProfiles_userId_idx`(`userId`),
    INDEX `developerProfiles_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `developerRates` (
    `id` VARCHAR(191) NOT NULL,
    `developerId` VARCHAR(191) NOT NULL,
    `costPerHour` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `billingRatePerHour` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `effectiveFrom` DATE NOT NULL,
    `effectiveTo` DATE NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT true,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `developerRates_developerId_idx`(`developerId`),
    INDEX `developerRates_developerId_effectiveFrom_effectiveTo_idx`(`developerId`, `effectiveFrom`, `effectiveTo`),
    INDEX `developerRates_developerId_isCurrent_idx`(`developerId`, `isCurrent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(50) NULL,
    `contactName` VARCHAR(150) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(30) NULL,
    `companyWebsite` VARCHAR(500) NULL,
    `billingAddress` TEXT NULL,
    `notes` TEXT NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `clients_code_key`(`code`),
    INDEX `clients_name_idx`(`name`),
    INDEX `clients_isActive_idx`(`isActive`),
    INDEX `clients_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `budget` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'DELAYED') NOT NULL DEFAULT 'DRAFT',
    `technologyStack` JSON NULL,
    `projectManagerId` VARCHAR(191) NOT NULL,
    `teamLeaderId` VARCHAR(191) NULL,
    `gitRepositoryUrl` VARCHAR(500) NULL,
    `stagingUrl` VARCHAR(500) NULL,
    `productionUrl` VARCHAR(500) NULL,
    `apiDocumentationUrl` VARCHAR(500) NULL,
    `notes` TEXT NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `projects_code_key`(`code`),
    INDEX `projects_clientId_idx`(`clientId`),
    INDEX `projects_projectManagerId_idx`(`projectManagerId`),
    INDEX `projects_teamLeaderId_idx`(`teamLeaderId`),
    INDEX `projects_status_idx`(`status`),
    INDEX `projects_isActive_idx`(`isActive`),
    INDEX `projects_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projectMembers` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleInProject` ENUM('PROJECT_MANAGER', 'TEAM_LEADER', 'DEVELOPER', 'REVIEWER', 'QA', 'DESIGNER', 'OBSERVER') NOT NULL DEFAULT 'DEVELOPER',
    `allocationPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
    `assignedDate` DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `releasedDate` DATE NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `projectMembers_projectId_idx`(`projectId`),
    INDEX `projectMembers_userId_idx`(`userId`),
    INDEX `projectMembers_roleInProject_idx`(`roleInProject`),
    INDEX `projectMembers_isActive_idx`(`isActive`),
    INDEX `projectMembers_releasedDate_idx`(`releasedDate`),
    UNIQUE INDEX `projectMembers_projectId_userId_key`(`projectId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projectAttachments` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(150) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `storagePath` VARCHAR(500) NOT NULL,
    `publicUrl` VARCHAR(500) NULL,
    `description` TEXT NULL,
    `uploadedBy` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `projectAttachments_projectId_idx`(`projectId`),
    INDEX `projectAttachments_mimeType_idx`(`mimeType`),
    INDEX `projectAttachments_uploadedBy_idx`(`uploadedBy`),
    INDEX `projectAttachments_isActive_idx`(`isActive`),
    INDEX `projectAttachments_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projectLinks` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `type` ENUM('GIT', 'STAGING', 'PRODUCTION', 'API_DOCS', 'DESIGN', 'DOCUMENTATION', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `description` TEXT NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `projectLinks_projectId_idx`(`projectId`),
    INDEX `projectLinks_type_idx`(`type`),
    INDEX `projectLinks_isActive_idx`(`isActive`),
    INDEX `projectLinks_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projectCredentials` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `type` ENUM('SERVER', 'STAGING', 'PRODUCTION', 'API', 'DATABASE', 'GIT', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `username` VARCHAR(191) NULL,
    `encryptedValue` TEXT NOT NULL,
    `encryptionIv` VARCHAR(64) NOT NULL,
    `authTag` VARCHAR(64) NOT NULL,
    `host` VARCHAR(255) NULL,
    `port` INTEGER NULL,
    `notes` TEXT NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `projectCredentials_projectId_idx`(`projectId`),
    INDEX `projectCredentials_type_idx`(`type`),
    INDEX `projectCredentials_isActive_idx`(`isActive`),
    INDEX `projectCredentials_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `milestones` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `startDate` DATE NULL,
    `dueDate` DATE NULL,
    `responsibleUserId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'HOLD', 'COMPLETED', 'DELAYED') NOT NULL DEFAULT 'PENDING',
    `progressPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `notes` TEXT NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `milestones_projectId_idx`(`projectId`),
    INDEX `milestones_responsibleUserId_idx`(`responsibleUserId`),
    INDEX `milestones_status_idx`(`status`),
    INDEX `milestones_dueDate_idx`(`dueDate`),
    INDEX `milestones_isActive_idx`(`isActive`),
    INDEX `milestones_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sprints` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `milestoneId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `goal` TEXT NULL,
    `startDate` DATE NULL,
    `endDate` DATE NULL,
    `status` ENUM('PLANNING', 'ACTIVE', 'HOLD', 'COMPLETED') NOT NULL DEFAULT 'PLANNING',
    `capacity` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `velocity` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `storyPoints` INTEGER NOT NULL DEFAULT 0,
    `progressPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `sprints_projectId_idx`(`projectId`),
    INDEX `sprints_milestoneId_idx`(`milestoneId`),
    INDEX `sprints_status_idx`(`status`),
    INDEX `sprints_startDate_idx`(`startDate`),
    INDEX `sprints_endDate_idx`(`endDate`),
    INDEX `sprints_isActive_idx`(`isActive`),
    INDEX `sprints_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `milestoneId` VARCHAR(191) NULL,
    `sprintId` VARCHAR(191) NULL,
    `parentTaskId` VARCHAR(191) NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `assignedDeveloperId` VARCHAR(191) NULL,
    `reviewerId` VARCHAR(191) NULL,
    `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    `status` ENUM('TODO', 'IN_PROGRESS', 'REVIEW', 'TESTING', 'COMPLETED', 'BLOCKED', 'HOLD') NOT NULL DEFAULT 'TODO',
    `estimatedHours` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `actualHours` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `storyPoints` INTEGER NOT NULL DEFAULT 0,
    `progressPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `startDate` DATE NULL,
    `dueDate` DATE NULL,
    `completedDate` DATE NULL,
    `labels` JSON NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `tasks_projectId_idx`(`projectId`),
    INDEX `tasks_milestoneId_idx`(`milestoneId`),
    INDEX `tasks_sprintId_idx`(`sprintId`),
    INDEX `tasks_parentTaskId_idx`(`parentTaskId`),
    INDEX `tasks_assignedDeveloperId_idx`(`assignedDeveloperId`),
    INDEX `tasks_reviewerId_idx`(`reviewerId`),
    INDEX `tasks_status_idx`(`status`),
    INDEX `tasks_priority_idx`(`priority`),
    INDEX `tasks_dueDate_idx`(`dueDate`),
    INDEX `tasks_isActive_idx`(`isActive`),
    INDEX `tasks_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taskDependencies` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `dependsOnTaskId` VARCHAR(191) NOT NULL,
    `type` ENUM('BLOCKS', 'DEPENDS_ON', 'RELATES_TO') NOT NULL DEFAULT 'DEPENDS_ON',
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `taskDependencies_taskId_idx`(`taskId`),
    INDEX `taskDependencies_dependsOnTaskId_idx`(`dependsOnTaskId`),
    INDEX `taskDependencies_type_idx`(`type`),
    UNIQUE INDEX `taskDependencies_taskId_dependsOnTaskId_key`(`taskId`, `dependsOnTaskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taskBlockers` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `isResolved` BOOLEAN NOT NULL DEFAULT false,
    `resolvedAt` DATETIME(3) NULL,
    `reportedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `taskBlockers_taskId_idx`(`taskId`),
    INDEX `taskBlockers_isResolved_idx`(`isResolved`),
    INDEX `taskBlockers_reportedBy_idx`(`reportedBy`),
    INDEX `taskBlockers_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taskComments` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `comment` TEXT NOT NULL,
    `mentions` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `taskComments_taskId_idx`(`taskId`),
    INDEX `taskComments_userId_idx`(`userId`),
    INDEX `taskComments_isActive_idx`(`isActive`),
    INDEX `taskComments_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taskAttachments` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `originalName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(150) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `storagePath` VARCHAR(500) NOT NULL,
    `publicUrl` VARCHAR(500) NULL,
    `uploadedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `taskAttachments_taskId_idx`(`taskId`),
    INDEX `taskAttachments_mimeType_idx`(`mimeType`),
    INDEX `taskAttachments_uploadedBy_idx`(`uploadedBy`),
    INDEX `taskAttachments_isActive_idx`(`isActive`),
    INDEX `taskAttachments_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taskUpdates` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `developerId` VARCHAR(191) NOT NULL,
    `previousStatus` ENUM('TODO', 'IN_PROGRESS', 'REVIEW', 'TESTING', 'COMPLETED', 'BLOCKED', 'HOLD') NULL,
    `currentStatus` ENUM('TODO', 'IN_PROGRESS', 'REVIEW', 'TESTING', 'COMPLETED', 'BLOCKED', 'HOLD') NOT NULL,
    `progressPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `workDoneToday` TEXT NOT NULL,
    `planForTomorrow` TEXT NULL,
    `blockers` TEXT NULL,
    `timeSpent` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `updateDate` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `taskUpdates_taskId_idx`(`taskId`),
    INDEX `taskUpdates_projectId_idx`(`projectId`),
    INDEX `taskUpdates_developerId_idx`(`developerId`),
    INDEX `taskUpdates_updateDate_idx`(`updateDate`),
    INDEX `taskUpdates_currentStatus_idx`(`currentStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taskTimeLogs` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `developerId` VARCHAR(191) NOT NULL,
    `workDate` DATE NOT NULL,
    `hoursWorked` DECIMAL(8, 2) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `taskTimeLogs_taskId_idx`(`taskId`),
    INDEX `taskTimeLogs_projectId_idx`(`projectId`),
    INDEX `taskTimeLogs_developerId_idx`(`developerId`),
    INDEX `taskTimeLogs_workDate_idx`(`workDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dailyReports` (
    `id` VARCHAR(191) NOT NULL,
    `developerId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `reportDate` DATE NOT NULL,
    `generatedSummary` TEXT NOT NULL,
    `totalTasksUpdated` INTEGER NOT NULL DEFAULT 0,
    `totalHoursSpent` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    `blockersSummary` TEXT NULL,
    `tomorrowPlanSummary` TEXT NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `dailyReports_developerId_idx`(`developerId`),
    INDEX `dailyReports_projectId_idx`(`projectId`),
    INDEX `dailyReports_reportDate_idx`(`reportDate`),
    UNIQUE INDEX `dailyReports_developerId_projectId_reportDate_key`(`developerId`, `projectId`, `reportDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificationTemplates` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(150) NOT NULL,
    `type` ENUM('SYSTEM', 'PROJECT_ASSIGNED', 'TASK_ASSIGNED', 'TASK_UPDATED', 'TASK_COMMENT', 'TASK_BLOCKED', 'MILESTONE_DUE', 'SPRINT_UPDATED', 'DAILY_REPORT') NOT NULL,
    `channel` ENUM('IN_APP', 'EMAIL') NOT NULL,
    `subjectTemplate` VARCHAR(255) NULL,
    `bodyTemplate` TEXT NOT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `notificationTemplates_key_key`(`key`),
    INDEX `notificationTemplates_type_idx`(`type`),
    INDEX `notificationTemplates_channel_idx`(`channel`),
    INDEX `notificationTemplates_isActive_idx`(`isActive`),
    INDEX `notificationTemplates_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `userNotifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `type` ENUM('SYSTEM', 'PROJECT_ASSIGNED', 'TASK_ASSIGNED', 'TASK_UPDATED', 'TASK_COMMENT', 'TASK_BLOCKED', 'MILESTONE_DUE', 'SPRINT_UPDATED', 'DAILY_REPORT') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `entityType` VARCHAR(100) NULL,
    `entityId` VARCHAR(191) NULL,
    `metadata` JSON NULL,
    `status` ENUM('UNREAD', 'READ', 'ARCHIVED') NOT NULL DEFAULT 'UNREAD',
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    INDEX `userNotifications_userId_idx`(`userId`),
    INDEX `userNotifications_type_idx`(`type`),
    INDEX `userNotifications_status_idx`(`status`),
    INDEX `userNotifications_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `userNotifications_createdAt_idx`(`createdAt`),
    INDEX `userNotifications_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificationPreferences` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('SYSTEM', 'PROJECT_ASSIGNED', 'TASK_ASSIGNED', 'TASK_UPDATED', 'TASK_COMMENT', 'TASK_BLOCKED', 'MILESTONE_DUE', 'SPRINT_UPDATED', 'DAILY_REPORT') NOT NULL,
    `channel` ENUM('IN_APP', 'EMAIL') NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notificationPreferences_userId_idx`(`userId`),
    INDEX `notificationPreferences_type_idx`(`type`),
    INDEX `notificationPreferences_channel_idx`(`channel`),
    UNIQUE INDEX `notificationPreferences_userId_type_channel_key`(`userId`, `type`, `channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `emailLogs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `templateId` VARCHAR(191) NULL,
    `toEmail` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `status` ENUM('PENDING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `provider` VARCHAR(100) NULL,
    `providerMessageId` VARCHAR(191) NULL,
    `errorMessage` TEXT NULL,
    `sentAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `emailLogs_userId_idx`(`userId`),
    INDEX `emailLogs_templateId_idx`(`templateId`),
    INDEX `emailLogs_toEmail_idx`(`toEmail`),
    INDEX `emailLogs_status_idx`(`status`),
    INDEX `emailLogs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backgroundJobRuns` (
    `id` VARCHAR(191) NOT NULL,
    `jobName` VARCHAR(150) NOT NULL,
    `runKey` VARCHAR(191) NOT NULL,
    `status` ENUM('RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'RUNNING',
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,
    `summary` JSON NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `backgroundJobRuns_runKey_key`(`runKey`),
    INDEX `backgroundJobRuns_jobName_idx`(`jobName`),
    INDEX `backgroundJobRuns_status_idx`(`status`),
    INDEX `backgroundJobRuns_startedAt_idx`(`startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `refreshTokens` ADD CONSTRAINT `refreshTokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refreshTokens` ADD CONSTRAINT `refreshTokens_replacedByTokenId_fkey` FOREIGN KEY (`replacedByTokenId`) REFERENCES `refreshTokens`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rolePermissions` ADD CONSTRAINT `rolePermissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rolePermissions` ADD CONSTRAINT `rolePermissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userRoles` ADD CONSTRAINT `userRoles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userRoles` ADD CONSTRAINT `userRoles_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userRoles` ADD CONSTRAINT `userRoles_assignedBy_fkey` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `developerProfiles` ADD CONSTRAINT `developerProfiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `developerRates` ADD CONSTRAINT `developerRates_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_projectManagerId_fkey` FOREIGN KEY (`projectManagerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_teamLeaderId_fkey` FOREIGN KEY (`teamLeaderId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projectMembers` ADD CONSTRAINT `projectMembers_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projectMembers` ADD CONSTRAINT `projectMembers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projectAttachments` ADD CONSTRAINT `projectAttachments_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projectLinks` ADD CONSTRAINT `projectLinks_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projectCredentials` ADD CONSTRAINT `projectCredentials_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `milestones` ADD CONSTRAINT `milestones_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `milestones` ADD CONSTRAINT `milestones_responsibleUserId_fkey` FOREIGN KEY (`responsibleUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sprints` ADD CONSTRAINT `sprints_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sprints` ADD CONSTRAINT `sprints_milestoneId_fkey` FOREIGN KEY (`milestoneId`) REFERENCES `milestones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_milestoneId_fkey` FOREIGN KEY (`milestoneId`) REFERENCES `milestones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_sprintId_fkey` FOREIGN KEY (`sprintId`) REFERENCES `sprints`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_parentTaskId_fkey` FOREIGN KEY (`parentTaskId`) REFERENCES `tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignedDeveloperId_fkey` FOREIGN KEY (`assignedDeveloperId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskDependencies` ADD CONSTRAINT `taskDependencies_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskDependencies` ADD CONSTRAINT `taskDependencies_dependsOnTaskId_fkey` FOREIGN KEY (`dependsOnTaskId`) REFERENCES `tasks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskBlockers` ADD CONSTRAINT `taskBlockers_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskBlockers` ADD CONSTRAINT `taskBlockers_reportedBy_fkey` FOREIGN KEY (`reportedBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskComments` ADD CONSTRAINT `taskComments_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskComments` ADD CONSTRAINT `taskComments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskAttachments` ADD CONSTRAINT `taskAttachments_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskUpdates` ADD CONSTRAINT `taskUpdates_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskUpdates` ADD CONSTRAINT `taskUpdates_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskUpdates` ADD CONSTRAINT `taskUpdates_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskTimeLogs` ADD CONSTRAINT `taskTimeLogs_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskTimeLogs` ADD CONSTRAINT `taskTimeLogs_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskTimeLogs` ADD CONSTRAINT `taskTimeLogs_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dailyReports` ADD CONSTRAINT `dailyReports_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dailyReports` ADD CONSTRAINT `dailyReports_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userNotifications` ADD CONSTRAINT `userNotifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `userNotifications` ADD CONSTRAINT `userNotifications_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `notificationTemplates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificationPreferences` ADD CONSTRAINT `notificationPreferences_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emailLogs` ADD CONSTRAINT `emailLogs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `emailLogs` ADD CONSTRAINT `emailLogs_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `notificationTemplates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
