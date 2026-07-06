import { Router } from "express";
import { chatController } from "../controllers/chatController.js";
import { authRequired } from "../middlewares/authRequired.js";
import { permissionRequired } from "../middlewares/permissionRequired.js";
import { createDirectThreadSchema, createGroupThreadSchema, sendChatMessageSchema } from "../validators/chatValidators.js";
import { validateBody } from "../validators/validate.js";

export const chatRoutes = Router();

chatRoutes.use(authRequired);
chatRoutes.use(permissionRequired("chat.view"));

chatRoutes.get("/users", chatController.listUsers);
chatRoutes.get("/threads", chatController.listThreads);
chatRoutes.post("/direct", validateBody(createDirectThreadSchema), chatController.createDirectThread);
chatRoutes.post("/groups", permissionRequired("chat.group.manage"), validateBody(createGroupThreadSchema), chatController.createGroupThread);
chatRoutes.get("/threads/:threadId/messages", chatController.listMessages);
chatRoutes.post("/threads/:threadId/messages", permissionRequired("chat.message"), validateBody(sendChatMessageSchema), chatController.sendMessage);
