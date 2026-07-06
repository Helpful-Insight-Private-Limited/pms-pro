import { Router } from "express";
import { costingController } from "../controllers/costingController.js";
import { milestoneController } from "../controllers/milestoneController.js";
import { projectAssetController } from "../controllers/projectAssetController.js";
import { projectController } from "../controllers/projectController.js";
import { reportController } from "../controllers/reportController.js";
import { sprintController } from "../controllers/sprintController.js";
import { taskController } from "../controllers/taskController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { permissionRequired } from "../middlewares/permissionRequired.js";
import {
  createProjectAttachmentSchema,
  createProjectCredentialSchema,
  createProjectLinkSchema,
  updateProjectAttachmentSchema,
  updateProjectCredentialSchema,
  updateProjectLinkSchema
} from "../validators/projectAssetValidators.js";
import { createMilestoneSchema, updateMilestoneSchema } from "../validators/milestoneValidators.js";
import { assignProjectMembersSchema, createProjectSchema, updateProjectSchema } from "../validators/projectValidators.js";
import { createTaskUpdateSchema } from "../validators/reportValidators.js";
import { createSprintSchema, updateSprintSchema } from "../validators/sprintValidators.js";
import {
  createTaskAttachmentSchema,
  createTaskBlockerSchema,
  createTaskCommentSchema,
  createTaskSchema,
  updateTaskBlockerSchema,
  updateTaskSchema
} from "../validators/taskValidators.js";
import { createTaskTimeLogSchema, taskTimerSchema } from "../validators/costingValidators.js";
import { validateBody } from "../validators/validate.js";

export const projectRoutes = Router();

projectRoutes.post("/", authRequired, permissionRequired("project.create"), validateBody(createProjectSchema), projectController.create);
projectRoutes.get("/", authRequired, permissionRequired("project.view"), projectController.list);
projectRoutes.get("/:id", authRequired, permissionRequired("project.view"), projectController.getById);
projectRoutes.patch("/:id", authRequired, permissionRequired("project.update"), validateBody(updateProjectSchema), projectController.update);
projectRoutes.delete("/:id", authRequired, permissionRequired("project.delete"), projectController.remove);
projectRoutes.put(
  "/:id/members",
  authRequired,
  permissionRequired("project.assignTeam"),
  validateBody(assignProjectMembersSchema),
  projectController.assignMembers
);

projectRoutes.get("/:projectId/attachments", authRequired, permissionRequired("project.view"), projectAssetController.listAttachments);
projectRoutes.post(
  "/:projectId/attachments",
  authRequired,
  permissionRequired("projectAttachment.manage"),
  validateBody(createProjectAttachmentSchema),
  projectAssetController.createAttachment
);
projectRoutes.patch(
  "/:projectId/attachments/:attachmentId",
  authRequired,
  permissionRequired("projectAttachment.manage"),
  validateBody(updateProjectAttachmentSchema),
  projectAssetController.updateAttachment
);
projectRoutes.delete(
  "/:projectId/attachments/:attachmentId",
  authRequired,
  permissionRequired("projectAttachment.manage"),
  projectAssetController.deleteAttachment
);

projectRoutes.get("/:projectId/links", authRequired, permissionRequired("project.view"), projectAssetController.listLinks);
projectRoutes.post(
  "/:projectId/links",
  authRequired,
  permissionRequired("projectLink.manage"),
  validateBody(createProjectLinkSchema),
  projectAssetController.createLink
);
projectRoutes.patch(
  "/:projectId/links/:linkId",
  authRequired,
  permissionRequired("projectLink.manage"),
  validateBody(updateProjectLinkSchema),
  projectAssetController.updateLink
);
projectRoutes.delete(
  "/:projectId/links/:linkId",
  authRequired,
  permissionRequired("projectLink.manage"),
  projectAssetController.deleteLink
);

projectRoutes.get("/:projectId/credentials", authRequired, permissionRequired("credential.view"), projectAssetController.listCredentials);
projectRoutes.get("/:projectId/credentials/:credentialId/reveal", authRequired, permissionRequired("credential.view"), projectAssetController.revealCredential);
projectRoutes.post(
  "/:projectId/credentials",
  authRequired,
  permissionRequired("credential.manage"),
  validateBody(createProjectCredentialSchema),
  projectAssetController.createCredential
);
projectRoutes.patch(
  "/:projectId/credentials/:credentialId",
  authRequired,
  permissionRequired("credential.manage"),
  validateBody(updateProjectCredentialSchema),
  projectAssetController.updateCredential
);
projectRoutes.delete(
  "/:projectId/credentials/:credentialId",
  authRequired,
  permissionRequired("credential.manage"),
  projectAssetController.deleteCredential
);

projectRoutes.get("/:projectId/milestones", authRequired, permissionRequired("milestone.view"), milestoneController.list);
projectRoutes.post(
  "/:projectId/milestones",
  authRequired,
  permissionRequired("milestone.create"),
  validateBody(createMilestoneSchema),
  milestoneController.create
);
projectRoutes.post(
  "/:projectId/milestones/mark-delayed",
  authRequired,
  permissionRequired("milestone.update"),
  milestoneController.markDelayed
);
projectRoutes.get("/:projectId/milestones/:milestoneId", authRequired, permissionRequired("milestone.view"), milestoneController.getById);
projectRoutes.patch(
  "/:projectId/milestones/:milestoneId",
  authRequired,
  permissionRequired("milestone.update"),
  validateBody(updateMilestoneSchema),
  milestoneController.update
);
projectRoutes.delete(
  "/:projectId/milestones/:milestoneId",
  authRequired,
  permissionRequired("milestone.delete"),
  milestoneController.remove
);

projectRoutes.get("/:projectId/milestones/:milestoneId/sprints", authRequired, permissionRequired("sprint.view"), sprintController.list);
projectRoutes.post(
  "/:projectId/milestones/:milestoneId/sprints",
  authRequired,
  permissionRequired("sprint.create"),
  validateBody(createSprintSchema),
  sprintController.create
);
projectRoutes.get("/:projectId/milestones/:milestoneId/sprints/:sprintId", authRequired, permissionRequired("sprint.view"), sprintController.getById);
projectRoutes.get("/:projectId/milestones/:milestoneId/sprints/:sprintId/health", authRequired, permissionRequired("sprint.view"), sprintController.health);
projectRoutes.patch(
  "/:projectId/milestones/:milestoneId/sprints/:sprintId",
  authRequired,
  permissionRequired("sprint.update"),
  validateBody(updateSprintSchema),
  sprintController.update
);
projectRoutes.delete(
  "/:projectId/milestones/:milestoneId/sprints/:sprintId",
  authRequired,
  permissionRequired("sprint.delete"),
  sprintController.remove
);

projectRoutes.get("/:projectId/tasks", authRequired, permissionRequired("task.view"), taskController.list);
projectRoutes.post("/:projectId/tasks", authRequired, permissionRequired("task.create"), validateBody(createTaskSchema), taskController.create);
projectRoutes.post(
  "/:projectId/tasks/:taskId/timer/start",
  authRequired,
  permissionRequired("taskTimeLog.create"),
  validateBody(taskTimerSchema),
  costingController.startTaskTimer
);
projectRoutes.post(
  "/:projectId/tasks/:taskId/timer/stop",
  authRequired,
  permissionRequired("taskTimeLog.create"),
  validateBody(taskTimerSchema),
  costingController.stopTaskTimer
);
projectRoutes.get("/:projectId/tasks/:taskId/timer/active", authRequired, permissionRequired("taskTimeLog.view"), costingController.getActiveTaskTimer);
projectRoutes.get("/:projectId/tasks/:taskId", authRequired, permissionRequired("task.view"), taskController.getById);
projectRoutes.patch("/:projectId/tasks/:taskId", authRequired, permissionRequired("task.update"), validateBody(updateTaskSchema), taskController.update);
projectRoutes.delete("/:projectId/tasks/:taskId", authRequired, permissionRequired("task.delete"), taskController.remove);

projectRoutes.get("/:projectId/tasks/:taskId/comments", authRequired, permissionRequired("task.view"), taskController.listComments);
projectRoutes.post(
  "/:projectId/tasks/:taskId/comments",
  authRequired,
  permissionRequired("task.comment"),
  validateBody(createTaskCommentSchema),
  taskController.addComment
);

projectRoutes.post(
  "/:projectId/tasks/:taskId/blockers",
  authRequired,
  permissionRequired("task.blocker.manage"),
  validateBody(createTaskBlockerSchema),
  taskController.addBlocker
);
projectRoutes.patch(
  "/:projectId/tasks/:taskId/blockers/:blockerId",
  authRequired,
  permissionRequired("task.blocker.manage"),
  validateBody(updateTaskBlockerSchema),
  taskController.updateBlocker
);

projectRoutes.get("/:projectId/tasks/:taskId/attachments", authRequired, permissionRequired("task.view"), taskController.listAttachments);
projectRoutes.post(
  "/:projectId/tasks/:taskId/attachments",
  authRequired,
  permissionRequired("task.attachment.manage"),
  validateBody(createTaskAttachmentSchema),
  taskController.addAttachment
);

projectRoutes.post(
  "/:projectId/tasks/:taskId/updates",
  authRequired,
  permissionRequired("taskUpdate.create"),
  validateBody(createTaskUpdateSchema),
  reportController.createTaskUpdate
);
projectRoutes.post(
  "/:projectId/tasks/:taskId/time-logs",
  authRequired,
  permissionRequired("taskTimeLog.create"),
  validateBody(createTaskTimeLogSchema),
  costingController.createTimeLog
);
projectRoutes.get("/:projectId/tasks/:taskId/time-logs", authRequired, permissionRequired("taskTimeLog.view"), costingController.listTaskTimeLogs);
projectRoutes.get("/:projectId/task-updates", authRequired, permissionRequired("taskUpdate.view"), reportController.listTaskUpdates);
projectRoutes.post("/:projectId/daily-reports/generate", authRequired, permissionRequired("dailyReport.generate"), reportController.generateDailyReports);
projectRoutes.get("/:projectId/daily-reports", authRequired, permissionRequired("dailyReport.view"), reportController.listDailyReports);
projectRoutes.get("/:projectId/daily-summary", authRequired, permissionRequired("dailyReport.view"), reportController.getDailySummary);
projectRoutes.get("/:projectId/time-logs", authRequired, permissionRequired("taskTimeLog.view"), costingController.listProjectTimeLogs);
projectRoutes.get("/:projectId/costing", authRequired, permissionRequired("costing.view"), costingController.getProjectCosting);
