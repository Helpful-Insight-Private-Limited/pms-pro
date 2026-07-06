import { Router } from "express";
import { masterController } from "../controllers/masterController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { permissionRequired } from "../middlewares/permissionRequired.js";
import {
  createCurrencySchema,
  createTechnologyStackSchema,
  updateCurrencySchema,
  updateTechnologyStackSchema
} from "../validators/masterValidators.js";
import { validateBody } from "../validators/validate.js";

export const masterRoutes = Router();

masterRoutes.get("/currencies", authRequired, permissionRequired("master.view"), masterController.listCurrencies);
masterRoutes.post("/currencies", authRequired, permissionRequired("master.manage"), validateBody(createCurrencySchema), masterController.createCurrency);
masterRoutes.patch("/currencies/:id", authRequired, permissionRequired("master.manage"), validateBody(updateCurrencySchema), masterController.updateCurrency);
masterRoutes.delete("/currencies/:id", authRequired, permissionRequired("master.manage"), masterController.deleteCurrency);

masterRoutes.get("/technology-stacks", authRequired, permissionRequired("master.view"), masterController.listTechnologyStacks);
masterRoutes.post(
  "/technology-stacks",
  authRequired,
  permissionRequired("master.manage"),
  validateBody(createTechnologyStackSchema),
  masterController.createTechnologyStack
);
masterRoutes.patch(
  "/technology-stacks/:id",
  authRequired,
  permissionRequired("master.manage"),
  validateBody(updateTechnologyStackSchema),
  masterController.updateTechnologyStack
);
masterRoutes.delete("/technology-stacks/:id", authRequired, permissionRequired("master.manage"), masterController.deleteTechnologyStack);
