import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "../docs/openapi.js";

export const docsRoutes = Router();

docsRoutes.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});

docsRoutes.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument, {
  customSiteTitle: "PMS API Docs",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true
  }
}));
