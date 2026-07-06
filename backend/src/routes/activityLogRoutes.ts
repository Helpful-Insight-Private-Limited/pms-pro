import { Router } from "express";
import { activityLogController } from "../controllers/activityLogController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { permissionRequired } from "../middlewares/permissionRequired.js";

export const activityLogRoutes = Router();

activityLogRoutes.get("/", authRequired, permissionRequired("activityLog.view"), activityLogController.list);
activityLogRoutes.get("/:id", authRequired, permissionRequired("activityLog.view"), activityLogController.getById);
