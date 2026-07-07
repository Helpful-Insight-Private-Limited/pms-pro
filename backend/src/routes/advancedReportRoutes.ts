import { Router } from "express";
import { advancedReportController } from "../controllers/advancedReportController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { permissionRequired } from "../middlewares/permissionRequired.js";
import { sendProjectReportEmailSchema } from "../validators/reportValidators.js";
import { validateBody } from "../validators/validate.js";

export const advancedReportRoutes = Router();

advancedReportRoutes.get("/projects", authRequired, permissionRequired("report.view"), advancedReportController.projects);
advancedReportRoutes.get("/developers", authRequired, permissionRequired("report.view"), advancedReportController.developers);
advancedReportRoutes.get("/team", authRequired, permissionRequired("report.view"), advancedReportController.team);
advancedReportRoutes.get("/costing", authRequired, permissionRequired("costing.view"), advancedReportController.costing);
advancedReportRoutes.get("/estimated-vs-actual", authRequired, permissionRequired("costing.view"), advancedReportController.estimatedVsActual);
advancedReportRoutes.get("/budget-overruns", authRequired, permissionRequired("costing.view"), advancedReportController.budgetOverruns);
advancedReportRoutes.post("/projects/email", authRequired, permissionRequired("report.email"), validateBody(sendProjectReportEmailSchema), advancedReportController.sendProjectEmail);
