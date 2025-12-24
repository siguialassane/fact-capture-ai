import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";

import { config } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { healthRoutes } from "./routes/health.js";
import { analysisRoutes } from "./routes/analysis.js";
import { invoiceRoutes } from "./routes/invoices.js";
import { sessionRoutes } from "./routes/sessions.js";
import { exportRoutes } from "./routes/exports.js";
import accountingRoutes from "./routes/accounting.js";
import { journaux } from "./routes/journals.js";
import { grandLivre } from "./routes/grand-livre.js";
import { lettrage } from "./routes/lettrage.js";

// Create Hono app
export const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", timing());
app.use("*", prettyJSON());
app.use("*", secureHeaders());

// CORS configuration
app.use(
  "*",
  cors({
    origin: config.corsOrigins,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposeHeaders: ["X-Request-Id", "X-Response-Time"],
    credentials: true,
    maxAge: 86400,
  })
);

// Error handling
app.onError(errorHandler);

// API routes
app.route("/api/health", healthRoutes);
app.route("/api/analysis", analysisRoutes);
app.route("/api/invoices", invoiceRoutes);
app.route("/api/sessions", sessionRoutes);
app.route("/api/exports", exportRoutes);
app.route("/api/accounting", accountingRoutes);
app.route("/api/journals", journaux);
app.route("/api/grand-livre", grandLivre);
app.route("/api/lettrage", lettrage);

// Root endpoint
app.get("/", (c) => {
  return c.json({
    name: "Fact Capture AI Backend",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/api/health",
      analysis: "/api/analysis",
      invoices: "/api/invoices",
      sessions: "/api/sessions",
      exports: "/api/exports",
      accounting: "/api/accounting",
    },
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Not Found",
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404
  );
});
