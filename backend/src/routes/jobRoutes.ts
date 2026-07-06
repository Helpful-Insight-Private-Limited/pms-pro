import { Router } from "express";
import { jobController } from "../controllers/jobController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { permissionRequired } from "../middlewares/permissionRequired.js";
import { runJobSchema } from "../validators/jobValidators.js";
import { validateBody } from "../validators/validate.js";

export const jobRoutes = Router();

jobRoutes.get("/runs", authRequired, permissionRequired("job.view"), jobController.listRuns);
jobRoutes.post("/run", authRequired, permissionRequired("job.run"), validateBody(runJobSchema), jobController.run);
