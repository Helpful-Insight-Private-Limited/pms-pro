import { Router } from "express";
import { dashboardController } from "../controllers/dashboardController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { permissionRequired } from "../middlewares/permissionRequired.js";

export const dashboardRoutes = Router();

dashboardRoutes.get("/me", authRequired, permissionRequired("dashboard.view"), dashboardController.mine);
dashboardRoutes.get("/admin", authRequired, permissionRequired("dashboard.view"), dashboardController.admin);
dashboardRoutes.get("/project-manager", authRequired, permissionRequired("dashboard.view"), dashboardController.projectManager);
dashboardRoutes.get("/team-leader", authRequired, permissionRequired("dashboard.view"), dashboardController.teamLeader);
dashboardRoutes.get("/team-member", authRequired, permissionRequired("dashboard.view"), dashboardController.teamMember);
