ALTER TABLE `developerLeaves`
  ADD COLUMN `teamLeaderApprovalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `teamLeaderApprovedBy` VARCHAR(191) NULL,
  ADD COLUMN `teamLeaderApprovalNote` TEXT NULL,
  ADD COLUMN `teamLeaderApprovedAt` DATETIME(3) NULL,
  ADD COLUMN `projectManagerApprovalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED') NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `projectManagerApprovedBy` VARCHAR(191) NULL,
  ADD COLUMN `projectManagerApprovalNote` TEXT NULL,
  ADD COLUMN `projectManagerApprovedAt` DATETIME(3) NULL,
  ADD COLUMN `adminApprovalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED') NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN `adminApprovedBy` VARCHAR(191) NULL,
  ADD COLUMN `adminApprovalNote` TEXT NULL,
  ADD COLUMN `adminApprovedAt` DATETIME(3) NULL;

UPDATE `developerLeaves`
SET
  `teamLeaderApprovalStatus` = CASE WHEN `status` = 'APPROVED' THEN 'APPROVED' WHEN `status` = 'REJECTED' THEN 'REJECTED' ELSE `teamLeaderApprovalStatus` END,
  `projectManagerApprovalStatus` = CASE WHEN `status` = 'APPROVED' THEN 'APPROVED' WHEN `status` = 'REJECTED' THEN 'REJECTED' ELSE `projectManagerApprovalStatus` END,
  `adminApprovalStatus` = 'NOT_REQUIRED';
