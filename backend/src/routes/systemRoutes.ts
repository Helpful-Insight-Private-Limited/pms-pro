import { Router } from "express";
import { systemController } from "../controllers/systemController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { permissionRequired } from "../middlewares/permissionRequired.js";
import { cleanSystemSchema, updateSiteSettingsSchema } from "../validators/systemValidators.js";
import { validateBody } from "../validators/validate.js";

export const systemRoutes = Router();

systemRoutes.get("/site-settings", systemController.siteSettings);
systemRoutes.patch("/site-settings", authRequired, permissionRequired("system.manage"), validateBody(updateSiteSettingsSchema), systemController.updateSiteSettings);
systemRoutes.post("/clean-demo-data", authRequired, permissionRequired("system.cleanup"), validateBody(cleanSystemSchema), systemController.cleanDemoData);

