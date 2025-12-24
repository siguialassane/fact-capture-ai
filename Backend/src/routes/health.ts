import { Hono } from "hono";
import { config, validateConfig, isOpenRouterConfigured, isSupabaseConfigured } from "../config/env.js";

export const healthRoutes = new Hono();

/**
 * GET /api/health
 * Basic health check
 */
healthRoutes.get("/", (c) => {
  return c.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/health/ready
 * Readiness check - verifies all dependencies are ready
 */
healthRoutes.get("/ready", (c) => {
  const configValidation = validateConfig();
  const openrouterReady = isOpenRouterConfigured();
  const supabaseReady = isSupabaseConfigured();

  const isReady = openrouterReady && supabaseReady;

  return c.json(
    {
      success: isReady,
      status: isReady ? "ready" : "not_ready",
      checks: {
        openrouter: {
          configured: openrouterReady,
          model: config.openrouterModel,
        },
        supabase: {
          configured: supabaseReady,
        },
        config: {
          valid: configValidation.valid,
          errors: configValidation.errors.length > 0 ? configValidation.errors : undefined,
        },
      },
      timestamp: new Date().toISOString(),
    },
    isReady ? 200 : 503
  );
});

/**
 * GET /api/health/live
 * Liveness check - simple ping
 */
healthRoutes.get("/live", (c) => {
  return c.json({
    success: true,
    status: "alive",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
