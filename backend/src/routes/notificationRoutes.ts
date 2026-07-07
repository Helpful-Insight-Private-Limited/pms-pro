import { Router } from "express";
import { notificationController } from "../controllers/notificationController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { permissionRequired } from "../middlewares/permissionRequired.js";
import {
  createDomainNotificationSchema,
  createNotificationTemplateSchema,
  pushSubscriptionSchema,
  unsubscribePushSubscriptionSchema,
  updateNotificationPreferencesSchema,
  updateNotificationTemplateSchema
} from "../validators/notificationValidators.js";
import { validateBody } from "../validators/validate.js";

export const notificationRoutes = Router();

notificationRoutes.get("/", authRequired, permissionRequired("notification.view"), notificationController.listMine);
notificationRoutes.get("/push/public-key", authRequired, permissionRequired("notification.view"), notificationController.pushPublicKey);
notificationRoutes.get("/email-status", authRequired, permissionRequired("notification.view"), notificationController.emailStatus);
notificationRoutes.post(
  "/push/subscribe",
  authRequired,
  permissionRequired("notification.view"),
  validateBody(pushSubscriptionSchema),
  notificationController.subscribePush
);
notificationRoutes.post(
  "/push/unsubscribe",
  authRequired,
  permissionRequired("notification.view"),
  validateBody(unsubscribePushSubscriptionSchema),
  notificationController.unsubscribePush
);
notificationRoutes.patch("/:id/read", authRequired, permissionRequired("notification.view"), notificationController.markRead);
notificationRoutes.patch("/read-all", authRequired, permissionRequired("notification.view"), notificationController.markAllRead);
notificationRoutes.get("/preferences", authRequired, permissionRequired("notification.view"), notificationController.listPreferences);
notificationRoutes.put(
  "/preferences",
  authRequired,
  permissionRequired("notification.view"),
  validateBody(updateNotificationPreferencesSchema),
  notificationController.updatePreferences
);
notificationRoutes.post(
  "/domain-events",
  authRequired,
  permissionRequired("notification.manage"),
  validateBody(createDomainNotificationSchema),
  notificationController.createDomainNotification
);
notificationRoutes.get("/templates", authRequired, permissionRequired("notificationTemplate.manage"), notificationController.listTemplates);
notificationRoutes.post(
  "/templates",
  authRequired,
  permissionRequired("notificationTemplate.manage"),
  validateBody(createNotificationTemplateSchema),
  notificationController.createTemplate
);
notificationRoutes.patch(
  "/templates/:id",
  authRequired,
  permissionRequired("notificationTemplate.manage"),
  validateBody(updateNotificationTemplateSchema),
  notificationController.updateTemplate
);
notificationRoutes.get("/email-logs", authRequired, permissionRequired("emailLog.view"), notificationController.listEmailLogs);
