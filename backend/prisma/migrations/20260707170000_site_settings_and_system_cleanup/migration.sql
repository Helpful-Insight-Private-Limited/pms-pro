CREATE TABLE `siteSettings` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(50) NOT NULL DEFAULT 'default',
    `appName` VARCHAR(150) NOT NULL DEFAULT 'PMS Workspace',
    `tagline` VARCHAR(255) NULL,
    `logoUrl` VARCHAR(500) NULL,
    `faviconUrl` VARCHAR(500) NULL,
    `metaTitle` VARCHAR(150) NOT NULL DEFAULT 'PMS',
    `metaDescription` VARCHAR(300) NULL,
    `metaKeywords` VARCHAR(500) NULL,
    `companyName` VARCHAR(150) NULL,
    `supportEmail` VARCHAR(191) NULL,
    `primaryColor` VARCHAR(20) NOT NULL DEFAULT '#111827',
    `accentColor` VARCHAR(20) NOT NULL DEFAULT '#f4c430',
    `createdBy` VARCHAR(191) NULL,
    `updatedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `siteSettings_key_key`(`key`),
    INDEX `siteSettings_key_idx`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

