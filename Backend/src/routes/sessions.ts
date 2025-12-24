import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { createClient } from "@supabase/supabase-js";
import { config, isSupabaseConfigured } from "../config/env.js";
import { Errors } from "../middleware/error-handler.js";

export const sessionRoutes = new Hono();

// Supabase client
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabase && isSupabaseConfigured()) {
    supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }
  return supabase;
}

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
  const db = getSupabase();
  if (!db) {
    throw Errors.configurationError("Supabase is not configured");
  }

  const status = c.req.query("status");

  let query = db
    .from("capture_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Sessions] List error:", error);
    throw Errors.internal("Failed to fetch sessions");
  }

  return c.json({
    success: true,
    data: data || [],
  });
});

/**
 * GET /api/sessions/:id
 * Get a specific session
 */
sessionRoutes.get("/:id", async (c) => {
  const db = getSupabase();
  if (!db) {
    throw Errors.configurationError("Supabase is not configured");
  }

  const id = c.req.param("id");

  const { data, error } = await db
    .from("capture_sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw Errors.notFound("Session");
    }
    console.error("[Sessions] Get error:", error);
    throw Errors.internal("Failed to fetch session");
  }

  return c.json({
    success: true,
    data,
  });
});

/**
 * POST /api/sessions
 * Create a new capture session (for PWA sync)
 */
sessionRoutes.post(
  "/",
  zValidator("json", CreateSessionSchema),
  async (c) => {
    const db = getSupabase();
    if (!db) {
      throw Errors.configurationError("Supabase is not configured");
    }

    const { desktopId, expiresInMinutes } = c.req.valid("json");

    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    // @ts-expect-error - Supabase types not generated
    const { data, error } = await db
      .from("capture_sessions")
      .insert([
        {
          status: "waiting",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[Sessions] Create error:", error);
      throw Errors.internal("Failed to create session");
    }

    return c.json(
      {
        success: true,
        data,
      },
      201
    );
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
    const db = getSupabase();
    if (!db) {
      throw Errors.configurationError("Supabase is not configured");
    }

    const id = c.req.param("id");
    const updates = c.req.valid("json");

    // @ts-expect-error - Supabase types not generated
    const { data, error } = await db
      .from("capture_sessions")
      .update(updates as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw Errors.notFound("Session");
      }
      console.error("[Sessions] Update error:", error);
      throw Errors.internal("Failed to update session");
    }

    return c.json({
      success: true,
      data,
    });
  }
);

/**
 * DELETE /api/sessions/:id
 * Delete a session
 */
sessionRoutes.delete("/:id", async (c) => {
  const db = getSupabase();
  if (!db) {
    throw Errors.configurationError("Supabase is not configured");
  }

  const id = c.req.param("id");

  const { error } = await db.from("capture_sessions").delete().eq("id", id);

  if (error) {
    console.error("[Sessions] Delete error:", error);
    throw Errors.internal("Failed to delete session");
  }

  return c.json({
    success: true,
    message: "Session deleted",
  });
});

/**
 * POST /api/sessions/cleanup
 * Clean up expired sessions (for cron job)
 */
sessionRoutes.post("/cleanup", async (c) => {
  const db = getSupabase();
  if (!db) {
    throw Errors.configurationError("Supabase is not configured");
  }

  // @ts-expect-error - Supabase types not generated
  const { data, error } = await db
    .from("capture_sessions")
    .update({ status: "expired" } as any)
    .lt("expires_at", new Date().toISOString())
    .eq("status", "pending")
    .select();

  if (error) {
    console.error("[Sessions] Cleanup error:", error);
    throw Errors.internal("Failed to cleanup sessions");
  }

  const expiredCount = data?.length || 0;

  console.log(`[Sessions] Cleaned up ${expiredCount} expired sessions`);

  return c.json({
    success: true,
    data: {
      expiredCount,
    },
  });
});
