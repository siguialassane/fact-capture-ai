import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { isSupabaseAvailable } from "../lib/supabase.js";
import { Errors } from "../middleware/error-handler.js";
import { InvoiceRepository } from "../repositories/index.js";

export const invoiceRoutes = new Hono();

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
  if (!isSupabaseAvailable()) {
    throw Errors.configurationError("Supabase is not configured");
  }

  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  try {
    const result = await InvoiceRepository.findAll({ limit, offset });
    return c.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    console.error("[Invoices] List error:", error);
    throw Errors.internal("Failed to fetch invoices");
  }
});

/**
 * GET /api/invoices/latest
 * Get the latest invoice
 */
invoiceRoutes.get("/latest", async (c) => {
  if (!isSupabaseAvailable()) {
    throw Errors.configurationError("Supabase is not configured");
  }

  try {
    const data = await InvoiceRepository.findLatest();
    return c.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[Invoices] Latest error:", error);
    throw Errors.internal("Failed to fetch latest invoice");
  }
});

/**
 * GET /api/invoices/:id
 * Get a specific invoice
 */
invoiceRoutes.get("/:id", async (c) => {
  if (!isSupabaseAvailable()) {
    throw Errors.configurationError("Supabase is not configured");
  }

  const id = c.req.param("id");

  try {
    const data = await InvoiceRepository.findById(id);
    if (!data) {
      throw Errors.notFound("Invoice");
    }
    return c.json({
      success: true,
      data,
    });
  } catch (error) {
    if ((error as any)?.statusCode === 404) {
      throw error;
    }
    console.error("[Invoices] Get error:", error);
    throw Errors.internal("Failed to fetch invoice");
  }
});

/**
 * POST /api/invoices
 * Create a new invoice
 */
invoiceRoutes.post(
  "/",
  zValidator("json", CreateInvoiceSchema),
  async (c) => {
    if (!isSupabaseAvailable()) {
      throw Errors.configurationError("Supabase is not configured");
    }

    const { imageBase64, aiResult } = c.req.valid("json");

    try {
      const data = await InvoiceRepository.create({
        imageBase64,
        aiResult: aiResult || null,
      });

      return c.json(
        {
          success: true,
          data,
        },
        201
      );
    } catch (error) {
      console.error("[Invoices] Create error:", error);
      throw Errors.internal("Failed to create invoice");
    }
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
    if (!isSupabaseAvailable()) {
      throw Errors.configurationError("Supabase is not configured");
    }

    const id = c.req.param("id");
    const { aiResult } = c.req.valid("json");

    try {
      const data = await InvoiceRepository.update(id, { aiResult });
      return c.json({
        success: true,
        data,
      });
    } catch (error) {
      if ((error as Error).message === "Invoice not found") {
        throw Errors.notFound("Invoice");
      }
      console.error("[Invoices] Update error:", error);
      throw Errors.internal("Failed to update invoice");
    }
  }
);

/**
 * DELETE /api/invoices/:id
 * Delete an invoice
 */
invoiceRoutes.delete("/:id", async (c) => {
  if (!isSupabaseAvailable()) {
    throw Errors.configurationError("Supabase is not configured");
  }

  const id = c.req.param("id");

  try {
    await InvoiceRepository.delete(id);
    return c.json({
      success: true,
      message: "Invoice deleted",
    });
  } catch (error) {
    console.error("[Invoices] Delete error:", error);
    throw Errors.internal("Failed to delete invoice");
  }
});
