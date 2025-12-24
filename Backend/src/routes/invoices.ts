import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { createClient } from "@supabase/supabase-js";
import { config, isSupabaseConfigured } from "../config/env.js";
import { Errors } from "../middleware/error-handler.js";

export const invoiceRoutes = new Hono();

// Supabase client (lazy initialization)
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabase && isSupabaseConfigured()) {
    supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }
  return supabase;
}

// Schemas
const CreateInvoiceSchema = z.object({
  imageBase64: z.string().min(1),
  aiResult: z.any().optional(),
});

const UpdateInvoiceSchema = z.object({
  aiResult: z.any(),
});

/**
 * GET /api/invoices
 * List all invoices
 */
invoiceRoutes.get("/", async (c) => {
  const db = getSupabase();
  if (!db) {
    throw Errors.configurationError("Supabase is not configured");
  }

  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const { data, error, count } = await db
    .from("invoices")
    .select("id, created_at, ai_result, session_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[Invoices] List error:", error);
    throw Errors.internal("Failed to fetch invoices");
  }

  return c.json({
    success: true,
    data: data || [],
    meta: {
      total: count || 0,
      limit,
      offset,
    },
  });
});

/**
 * GET /api/invoices/latest
 * Get the latest invoice
 */
invoiceRoutes.get("/latest", async (c) => {
  const db = getSupabase();
  if (!db) {
    throw Errors.configurationError("Supabase is not configured");
  }

  const { data, error } = await db
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[Invoices] Latest error:", error);
    throw Errors.internal("Failed to fetch latest invoice");
  }

  return c.json({
    success: true,
    data: data || null,
  });
});

/**
 * GET /api/invoices/:id
 * Get a specific invoice
 */
invoiceRoutes.get("/:id", async (c) => {
  const db = getSupabase();
  if (!db) {
    throw Errors.configurationError("Supabase is not configured");
  }

  const id = c.req.param("id");

  const { data, error } = await db
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw Errors.notFound("Invoice");
    }
    console.error("[Invoices] Get error:", error);
    throw Errors.internal("Failed to fetch invoice");
  }

  return c.json({
    success: true,
    data,
  });
});

/**
 * POST /api/invoices
 * Create a new invoice
 */
invoiceRoutes.post(
  "/",
  zValidator("json", CreateInvoiceSchema),
  async (c) => {
    const db = getSupabase();
    if (!db) {
      throw Errors.configurationError("Supabase is not configured");
    }

    const { imageBase64, aiResult } = c.req.valid("json");

    // @ts-expect-error - Supabase types not generated
    const { data, error } = await db
      .from("invoices")
      .insert([
        {
          image_base64: imageBase64,
          image_path: '',
          image_url: '',
          ai_result: aiResult || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[Invoices] Create error:", error);
      throw Errors.internal("Failed to create invoice");
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
 * PATCH /api/invoices/:id
 * Update invoice AI result
 */
invoiceRoutes.patch(
  "/:id",
  zValidator("json", UpdateInvoiceSchema),
  async (c) => {
    const db = getSupabase();
    if (!db) {
      throw Errors.configurationError("Supabase is not configured");
    }

    const id = c.req.param("id");
    const { aiResult } = c.req.valid("json");

    // @ts-expect-error - Supabase types not generated
    const { data, error } = await db
      .from("invoices")
      .update({ ai_result: aiResult } as any)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw Errors.notFound("Invoice");
      }
      console.error("[Invoices] Update error:", error);
      throw Errors.internal("Failed to update invoice");
    }

    return c.json({
      success: true,
      data,
    });
  }
);

/**
 * DELETE /api/invoices/:id
 * Delete an invoice
 */
invoiceRoutes.delete("/:id", async (c) => {
  const db = getSupabase();
  if (!db) {
    throw Errors.configurationError("Supabase is not configured");
  }

  const id = c.req.param("id");

  const { error } = await db.from("invoices").delete().eq("id", id);

  if (error) {
    console.error("[Invoices] Delete error:", error);
    throw Errors.internal("Failed to delete invoice");
  }

  return c.json({
    success: true,
    message: "Invoice deleted",
  });
});
