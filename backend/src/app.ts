import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "node:path";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { rateLimiter } from "./middlewares/rateLimiters.js";
import { docsRoutes } from "./routes/docsRoutes.js";
import { routes } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  app.use(
    cors({
      origin: env.corsAllowedOrigins,
      credentials: true
    })
  );
  app.use(rateLimiter);
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads"), {
    fallthrough: false,
    immutable: true,
    maxAge: "30d"
  }));

  app.get("/health", (_req, res) => {
    res.json({
      success: true,
      data: {
        service: "pms-backend",
        status: "ok"
      }
    });
  });

  app.use(docsRoutes);
  app.use("/api", routes);
  app.use(errorHandler);

  return app;
}
