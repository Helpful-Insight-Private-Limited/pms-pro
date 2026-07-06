-- CreateTable
CREATE TABLE `activityLogs` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `action` VARCHAR(100) NOT NULL,
    `module` VARCHAR(100) NOT NULL,
    `entityType` VARCHAR(100) NULL,
    `entityId` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NULL,
    `taskId` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` VARCHAR(500) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activityLogs_actorId_idx`(`actorId`),
    INDEX `activityLogs_action_idx`(`action`),
    INDEX `activityLogs_module_idx`(`module`),
    INDEX `activityLogs_entityType_entityId_idx`(`entityType`, `entityId`),
    INDEX `activityLogs_projectId_idx`(`projectId`),
    INDEX `activityLogs_taskId_idx`(`taskId`),
    INDEX `activityLogs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `activityLogs` ADD CONSTRAINT `activityLogs_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
