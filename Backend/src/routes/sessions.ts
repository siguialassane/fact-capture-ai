import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { isSupabaseAvailable } from "../lib/supabase.js";
import { Errors } from "../middleware/error-handler.js";
import { SessionRepository } from "../repositories/index.js";

export const sessionRoutes = new Hono();

// Schemas
const CreateSessionSchema = z.object({
  desktopId: z.string().optional(),
  expiresInMinutes: z.number().optional().default(15),
});

const UpdateSessionSchema = z.object({
  status: z.enum(["pending", "captured", "completed", "expired"]).optional(),
  imageBase64: z.string().optional(),
});

/**
 * GET /api/sessions
 * List active sessions
 */
sessionRoutes.get("/", async (c) => {
  if (!isSupabaseAvailable()) {
    throw Errors.configurationError("Supabase is not configured");
  }

  const status = c.req.query("status");

  try {
    const data = await SessionRepository.findAll(status);
    return c.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Sessions] List error:", error);
    throw Errors.internal("Failed to fetch sessions");
  }
});

/**
 * GET /api/sessions/:id
 * Get a specific session
 */
sessionRoutes.get("/:id", async (c) => {
  if (!isSupabaseAvailable()) {
    throw Errors.configurationError("Supabase is not configured");
  }

  const id = c.req.param("id");

  try {
    const data = await SessionRepository.findById(id);
    if (!data) {
      throw Errors.notFound("Session");
    }
    return c.json({
      success: true,
      data,
    });
  } catch (error) {
    if ((error as any)?.statusCode === 404) {
      throw error;
    }
    console.error("[Sessions] Get error:", error);
    throw Errors.internal("Failed to fetch session");
  }
});

/**
 * POST /api/sessions
 * Create a new capture session (for PWA sync)
 */
sessionRoutes.post(
  "/",
  zValidator("json", CreateSessionSchema),
  async (c) => {
    if (!isSupabaseAvailable()) {
      throw Errors.configurationError("Supabase is not configured");
    }

    const { desktopId, expiresInMinutes } = c.req.valid("json");

    try {
      const data = await SessionRepository.create({
        desktopId,
        expiresInMinutes,
      });

      return c.json(
        {
          success: true,
          data,
        },
        201
      );
    } catch (error) {
      console.error("[Sessions] Create error:", error);
      throw Errors.internal("Failed to create session");
    }
  }
);

/**
 * PATCH /api/sessions/:id
 * Update a session (e.g., when photo is captured)
 */
sessionRoutes.patch(
  "/:id",
  zValidator("json", UpdateSessionSchema),
  async (c) => {
    if (!isSupabaseAvailable()) {
      throw Errors.configurationError("Supabase is not configured");
    }

    const id = c.req.param("id");
    const updates = c.req.valid("json");

    try {
      const data = await SessionRepository.update(id, updates);
      return c.json({
        success: true,
        data,
      });
    } catch (error) {
      if ((error as Error).message === "Session not found") {
        throw Errors.notFound("Session");
      }
      console.error("[Sessions] Update error:", error);
      throw Errors.internal("Failed to update session");
    }
  }
);

/**
 * DELETE /api/sessions/:id
 * Delete a session
 */
sessionRoutes.delete("/:id", async (c) => {
  if (!isSupabaseAvailable()) {
    throw Errors.configurationError("Supabase is not configured");
  }

  const id = c.req.param("id");

  try {
    await SessionRepository.delete(id);
    return c.json({
      success: true,
      message: "Session deleted",
    });
  } catch (error) {
    console.error("[Sessions] Delete error:", error);
    throw Errors.internal("Failed to delete session");
  }
});

/**
 * POST /api/sessions/cleanup
 * Clean up expired sessions (for cron job)
 */
sessionRoutes.post("/cleanup", async (c) => {
  if (!isSupabaseAvailable()) {
    throw Errors.configurationError("Supabase is not configured");
  }

  try {
    const expiredCount = await SessionRepository.expirePending();
    return c.json({
      success: true,
      data: {
        expiredCount,
      },
    });
  } catch (error) {
    console.error("[Sessions] Cleanup error:", error);
    throw Errors.internal("Failed to cleanup sessions");
  }
});
