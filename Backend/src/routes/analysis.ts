import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  analyzeInvoiceImage,
  analyzePDFImages,
  chatWithInvoice,
  AnalyzeImageRequestSchema,
  ChatRequestSchema,
} from "../services/ai/index.js";
import { isOpenRouterConfigured } from "../config/env.js";
import { Errors } from "../middleware/error-handler.js";

export const analysisRoutes = new Hono();

/**
 * POST /api/analysis/image
 * Analyze an invoice image
 */
analysisRoutes.post(
  "/image",
  zValidator("json", AnalyzeImageRequestSchema),
  async (c) => {
    if (!isOpenRouterConfigured()) {
      throw Errors.configurationError("OpenRouter API is not configured");
    }

    const { imageBase64, isPdf } = c.req.valid("json");

    console.log(`[Analysis] Processing ${isPdf ? "PDF" : "image"} analysis request`);

    const startTime = Date.now();

    const result = isPdf
      ? await analyzePDFImages([imageBase64])
      : await analyzeInvoiceImage(imageBase64);

    const duration = Date.now() - startTime;

    if (!result) {
      throw Errors.aiAnalysisError("Failed to analyze the document");
    }

    console.log(`[Analysis] Completed in ${duration}ms`);

    return c.json({
      success: true,
      data: result,
      meta: {
        processingTime: duration,
        isInvoice: result.is_invoice,
        documentType: result.type_document,
      },
    });
  }
);

/**
 * POST /api/analysis/pdf
 * Analyze a PDF document (accepts array of page images)
 */
analysisRoutes.post("/pdf", async (c) => {
  if (!isOpenRouterConfigured()) {
    throw Errors.configurationError("OpenRouter API is not configured");
  }

  const body = await c.req.json();

  if (!body.pages || !Array.isArray(body.pages) || body.pages.length === 0) {
    throw Errors.badRequest("pages array is required and must not be empty");
  }

  console.log(`[Analysis] Processing PDF with ${body.pages.length} pages`);

  const startTime = Date.now();
  const result = await analyzePDFImages(body.pages);
  const duration = Date.now() - startTime;

  if (!result) {
    throw Errors.aiAnalysisError("Failed to analyze the PDF document");
  }

  console.log(`[Analysis] PDF completed in ${duration}ms`);

  return c.json({
    success: true,
    data: result,
    meta: {
      processingTime: duration,
      pageCount: body.pages.length,
      isInvoice: result.is_invoice,
    },
  });
});

/**
 * POST /api/analysis/chat
 * Chat about an invoice
 */
analysisRoutes.post(
  "/chat",
  zValidator("json", ChatRequestSchema),
  async (c) => {
    if (!isOpenRouterConfigured()) {
      throw Errors.configurationError("OpenRouter API is not configured");
    }

    const { message, invoiceData, imageBase64, conversationHistory, forceReanalyze } =
      c.req.valid("json");

    console.log(`[Chat] Message: "${message.substring(0, 50)}..." (reanalyze: ${forceReanalyze})`);

    const startTime = Date.now();

    const { response, updatedData } = await chatWithInvoice(
      message,
      {
        invoiceData,
        imageBase64: imageBase64 ?? null,
        conversationHistory,
      },
      forceReanalyze
    );

    const duration = Date.now() - startTime;

    console.log(`[Chat] Response generated in ${duration}ms (data updated: ${!!updatedData})`);

    return c.json({
      success: true,
      data: {
        response,
        updatedData,
      },
      meta: {
        processingTime: duration,
        hasUpdatedData: !!updatedData,
      },
    });
  }
);
