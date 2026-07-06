import { Router } from "express";
import { roleController } from "../controllers/roleController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { permissionRequired } from "../middlewares/permissionRequired.js";
import { assignRolePermissionsSchema, createRoleSchema, updateRoleSchema } from "../validators/roleValidators.js";
import { validateBody } from "../validators/validate.js";

export const roleRoutes = Router();

roleRoutes.post("/", authRequired, permissionRequired("role.create"), validateBody(createRoleSchema), roleController.create);
roleRoutes.get("/", authRequired, permissionRequired("role.view"), roleController.list);
roleRoutes.patch("/:id", authRequired, permissionRequired("role.update"), validateBody(updateRoleSchema), roleController.update);
roleRoutes.delete("/:id", authRequired, permissionRequired("role.delete"), roleController.remove);
roleRoutes.put(
  "/:id/permissions",
  authRequired,
  permissionRequired("permission.assign"),
  validateBody(assignRolePermissionsSchema),
  roleController.assignPermissions
);
