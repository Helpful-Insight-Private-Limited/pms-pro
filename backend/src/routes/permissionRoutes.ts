import { Router } from "express";
import { permissionController } from "../controllers/permissionController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { permissionRequired } from "../middlewares/permissionRequired.js";

export const permissionRoutes = Router();

permissionRoutes.get("/", authRequired, permissionRequired("permission.view"), permissionController.list);
