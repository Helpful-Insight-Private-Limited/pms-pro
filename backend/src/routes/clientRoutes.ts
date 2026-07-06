import { Router } from "express";
import { clientController } from "../controllers/clientController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { permissionRequired } from "../middlewares/permissionRequired.js";
import { createClientSchema, updateClientSchema } from "../validators/clientValidators.js";
import { validateBody } from "../validators/validate.js";

export const clientRoutes = Router();

clientRoutes.post("/", authRequired, permissionRequired("client.create"), validateBody(createClientSchema), clientController.create);
clientRoutes.get("/", authRequired, permissionRequired("client.view"), clientController.list);
clientRoutes.get("/:id", authRequired, permissionRequired("client.view"), clientController.getById);
clientRoutes.patch("/:id", authRequired, permissionRequired("client.update"), validateBody(updateClientSchema), clientController.update);
clientRoutes.delete("/:id", authRequired, permissionRequired("client.delete"), clientController.remove);
