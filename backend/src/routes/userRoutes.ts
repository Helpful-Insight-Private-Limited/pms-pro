import { Router } from "express";
import { userController } from "../controllers/userController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { permissionRequired } from "../middlewares/permissionRequired.js";
import { assignUserRolesSchema, createUserSchema, updateUserSchema } from "../validators/userValidators.js";
import { validateBody } from "../validators/validate.js";

export const userRoutes = Router();

userRoutes.post("/", authRequired, permissionRequired("user.create"), validateBody(createUserSchema), userController.create);
userRoutes.get("/", authRequired, permissionRequired("user.view"), userController.list);
userRoutes.get("/:id", authRequired, permissionRequired("user.view"), userController.getById);
userRoutes.patch("/:id", authRequired, permissionRequired("user.update"), validateBody(updateUserSchema), userController.update);
userRoutes.delete("/:id", authRequired, permissionRequired("user.delete"), userController.remove);
userRoutes.put(
  "/:id/roles",
  authRequired,
  permissionRequired("permission.assign"),
  validateBody(assignUserRolesSchema),
  userController.assignRoles
);
