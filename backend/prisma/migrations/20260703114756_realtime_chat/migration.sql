-- CreateTable
CREATE TABLE `chatThreads` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('DIRECT', 'GROUP') NOT NULL DEFAULT 'DIRECT',
    `name` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `chatThreads_type_idx`(`type`),
    INDEX `chatThreads_createdBy_idx`(`createdBy`),
    INDEX `chatThreads_isActive_idx`(`isActive`),
    INDEX `chatThreads_deletedAt_idx`(`deletedAt`),
    INDEX `chatThreads_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chatParticipants` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leftAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chatParticipants_threadId_idx`(`threadId`),
    INDEX `chatParticipants_userId_idx`(`userId`),
    INDEX `chatParticipants_role_idx`(`role`),
    INDEX `chatParticipants_leftAt_idx`(`leftAt`),
    UNIQUE INDEX `chatParticipants_threadId_userId_key`(`threadId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chatMessages` (
    `id` VARCHAR(191) NOT NULL,
    `threadId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `messageType` ENUM('TEXT', 'SYSTEM') NOT NULL DEFAULT 'TEXT',
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `editedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `chatMessages_threadId_idx`(`threadId`),
    INDEX `chatMessages_senderId_idx`(`senderId`),
    INDEX `chatMessages_messageType_idx`(`messageType`),
    INDEX `chatMessages_createdAt_idx`(`createdAt`),
    INDEX `chatMessages_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `chatThreads` ADD CONSTRAINT `chatThreads_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chatParticipants` ADD CONSTRAINT `chatParticipants_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `chatThreads`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chatParticipants` ADD CONSTRAINT `chatParticipants_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chatMessages` ADD CONSTRAINT `chatMessages_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `chatThreads`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chatMessages` ADD CONSTRAINT `chatMessages_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
