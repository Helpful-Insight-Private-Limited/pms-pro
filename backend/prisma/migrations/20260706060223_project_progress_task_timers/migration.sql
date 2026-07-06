-- AlterTable
ALTER TABLE `projects` ADD COLUMN `progressPercentage` DECIMAL(5, 2) NOT NULL DEFAULT 0.00;

-- CreateTable
CREATE TABLE `taskTimers` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `developerId` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `stoppedAt` DATETIME(3) NULL,
    `durationMinutes` INTEGER NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `taskTimers_taskId_idx`(`taskId`),
    INDEX `taskTimers_projectId_idx`(`projectId`),
    INDEX `taskTimers_developerId_idx`(`developerId`),
    INDEX `taskTimers_startedAt_idx`(`startedAt`),
    INDEX `taskTimers_stoppedAt_idx`(`stoppedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `taskTimers` ADD CONSTRAINT `taskTimers_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `tasks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskTimers` ADD CONSTRAINT `taskTimers_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskTimers` ADD CONSTRAINT `taskTimers_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
