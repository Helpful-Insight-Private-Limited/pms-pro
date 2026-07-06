import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { avatarUpload } from "../middlewares/avatarUpload.js";
import { validateBody } from "../validators/validate.js";
import { changePasswordSchema, loginSchema, updateProfileSchema } from "../validators/authValidators.js";

export const authRoutes = Router();

authRoutes.post("/login", validateBody(loginSchema), authController.login);
authRoutes.post("/refresh", authController.refresh);
authRoutes.post("/logout", authRequired, authController.logout);
authRoutes.post("/logout-all", authRequired, authController.logoutAll);
authRoutes.get("/me", authRequired, authController.me);
authRoutes.patch("/profile", authRequired, validateBody(updateProfileSchema), authController.updateProfile);
authRoutes.post("/profile/avatar", authRequired, avatarUpload.single("avatar"), authController.uploadAvatar);
authRoutes.post("/change-password", authRequired, validateBody(changePasswordSchema), authController.changePassword);
