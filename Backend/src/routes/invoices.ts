import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { isSupabaseAvailable, getSupabase } from "../lib/supabase.js";
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

  console.log(`[Invoices] List (limit=${limit}, offset=${offset})`);

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
 * GET /api/invoices/with-entries
 * List all invoices with linked accounting entries
 */
invoiceRoutes.get("/with-entries", async (c) => {
  if (!isSupabaseAvailable()) {
    throw Errors.configurationError("Supabase is not configured");
  }

  const limit = parseInt(c.req.query("limit") || "50", 10);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  console.log(`[Invoices] List with entries (limit=${limit}, offset=${offset})`);

  try {
    const result = await InvoiceRepository.findAllWithEntries({ limit, offset });
    return c.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    console.error("[Invoices] List with entries error:", error);
    throw Errors.internal("Failed to fetch invoices with entries");
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
    console.log("[Invoices] Fetch latest invoice");
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
    console.log(`[Invoices] Fetch invoice ${id}`);
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

/**
 * POST /api/invoices/cleanup-unvalidated
 * Supprime les factures qui n'ont aucune écriture comptable validée
 */
invoiceRoutes.post("/cleanup-unvalidated", async (c) => {
  if (!isSupabaseAvailable()) {
    throw Errors.configurationError("Supabase is not configured");
  }

  console.log("[Invoices] Cleanup unvalidated invoices requested");

  try {
    const { data: allInvoices, error: allError } = await getSupabase()
      .from("invoices")
      .select("id");

    if (allError) {
      console.error("[Invoices] Cleanup fetch invoices error:", allError);
      throw allError;
    }

    const allIds = (allInvoices || []).map((inv: { id: number }) => inv.id);
    if (allIds.length === 0) {
      return c.json({ success: true, deleted: 0 });
    }

    const { data: validatedEntries, error: validatedError } = await getSupabase()
      .from("journal_entries")
      .select("invoice_id")
      .in("statut", ["validee", "cloturee"])
      .not("invoice_id", "is", null);

    if (validatedError) {
      console.error("[Invoices] Cleanup fetch validated entries error:", validatedError);
      throw validatedError;
    }

    const validatedIds = Array.from(
      new Set(
        (validatedEntries || [])
          .map((row: { invoice_id: number | null }) => row.invoice_id)
          .filter((id: number | null): id is number => id !== null)
      )
    );

    const idsToDelete = allIds.filter((id) => !validatedIds.includes(id));

    if (idsToDelete.length === 0) {
      return c.json({ success: true, deleted: 0 });
    }

    const { data: entries, error: entriesError } = await getSupabase()
      .from("journal_entries")
      .select("id")
      .in("invoice_id", idsToDelete);

    if (entriesError) {
      console.error("[Invoices] Cleanup fetch entries error:", entriesError);
      throw entriesError;
    }

    const entryIds = (entries || []).map((e: { id: string }) => e.id);

    if (entryIds.length > 0) {
      const { error: linesError } = await getSupabase()
        .from("journal_entry_lines")
        .delete()
        .in("entry_id", entryIds);

      if (linesError) {
        console.error("[Invoices] Cleanup delete lines error:", linesError);
        throw linesError;
      }

      const { error: entriesDeleteError } = await getSupabase()
        .from("journal_entries")
        .delete()
        .in("id", entryIds);

      if (entriesDeleteError) {
        console.error("[Invoices] Cleanup delete entries error:", entriesDeleteError);
        throw entriesDeleteError;
      }
    }

    const { error: invoicesDeleteError } = await getSupabase()
      .from("invoices")
      .delete()
      .in("id", idsToDelete);

    if (invoicesDeleteError) {
      console.error("[Invoices] Cleanup delete invoices error:", invoicesDeleteError);
      throw invoicesDeleteError;
    }

    return c.json({ success: true, deleted: idsToDelete.length });
  } catch (error) {
    console.error("[Invoices] Cleanup error:", error);
    throw Errors.internal("Failed to cleanup unvalidated invoices");
  }
});

/**
 * POST /api/invoices/clear-tests
 * Clear all invoices and related test data
 */
invoiceRoutes.post("/clear-tests", async (c) => {
  if (!isSupabaseAvailable()) {
    throw Errors.configurationError("Supabase is not configured");
  }

  console.log("[Invoices] Clear tests requested");

  try {
    const { data: entries } = await getSupabase()
      .from("journal_entries")
      .select("id")
      .not("invoice_id", "is", null);

    const entryIds = (entries || []).map((e: { id: string }) => e.id);

    if (entryIds.length > 0) {
      const { error: linesError } = await getSupabase()
        .from("journal_entry_lines")
        .delete()
        .in("entry_id", entryIds);

      if (linesError) {
        console.error("[Invoices] Clear lines error:", linesError);
        throw linesError;
      }

      const { error: entriesError } = await getSupabase()
        .from("journal_entries")
        .delete()
        .in("id", entryIds);

      if (entriesError) {
        console.error("[Invoices] Clear entries error:", entriesError);
        throw entriesError;
      }
    }

    const { error: duplicatesError } = await getSupabase()
      .from("invoice_duplicates")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (duplicatesError) {
      console.error("[Invoices] Clear duplicates error:", duplicatesError);
      throw duplicatesError;
    }

    const { error: invoicesError } = await getSupabase()
      .from("invoices")
      .delete()
      .neq("id", 0);

    if (invoicesError) {
      console.error("[Invoices] Clear invoices error:", invoicesError);
      throw invoicesError;
    }

    console.log("[Invoices] Clear tests done");

    return c.json({
      success: true,
      data: { cleared: true },
    });
  } catch (error) {
    console.error("[Invoices] Clear tests error:", error);
    throw Errors.internal("Failed to clear test data");
  }
});
