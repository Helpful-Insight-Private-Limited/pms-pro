-- CreateTable
CREATE TABLE `calendarEvents` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('PROJECT', 'MILESTONE', 'SPRINT', 'TASK', 'LEAVE', 'HOLIDAY', 'MEETING', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `allDay` BOOLEAN NOT NULL DEFAULT false,
    `projectId` VARCHAR(191) NULL,
    `taskId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `calendarEvents_type_idx`(`type`),
    INDEX `calendarEvents_startAt_idx`(`startAt`),
    INDEX `calendarEvents_endAt_idx`(`endAt`),
    INDEX `calendarEvents_projectId_idx`(`projectId`),
    INDEX `calendarEvents_taskId_idx`(`taskId`),
    INDEX `calendarEvents_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `developerLeaves` (
    `id` VARCHAR(191) NOT NULL,
    `developerId` VARCHAR(191) NOT NULL,
    `type` ENUM('FULL_DAY', 'HALF_DAY', 'SICK', 'CASUAL', 'VACATION', 'UNPAID') NOT NULL DEFAULT 'FULL_DAY',
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `reason` TEXT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `developerLeaves_developerId_idx`(`developerId`),
    INDEX `developerLeaves_status_idx`(`status`),
    INDEX `developerLeaves_startDate_idx`(`startDate`),
    INDEX `developerLeaves_endDate_idx`(`endDate`),
    INDEX `developerLeaves_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `holidays` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `holidayDate` DATE NOT NULL,
    `region` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `holidays_holidayDate_idx`(`holidayDate`),
    INDEX `holidays_region_idx`(`region`),
    INDEX `holidays_deletedAt_idx`(`deletedAt`),
    UNIQUE INDEX `holidays_holidayDate_region_key`(`holidayDate`, `region`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `developerLeaves` ADD CONSTRAINT `developerLeaves_developerId_fkey` FOREIGN KEY (`developerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
