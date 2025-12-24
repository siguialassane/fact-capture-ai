import { callOpenRouter, buildImageMessage, buildTextMessage } from "./openrouter-client.js";
import { parseAIResponse, normalizeInvoiceData, extractModifiedDataFromChat, cleanChatResponse } from "./parser.js";
import { INVOICE_ANALYSIS_PROMPT, CHAT_SYSTEM_PROMPT, REANALYSIS_PROMPT } from "./prompts.js";
import type { InvoiceAIResult, ChatContext, OpenRouterMessage } from "./types.js";

/**
 * Analyze an invoice image using AI
 * Objectif: Extraire les données essentielles pour une écriture comptable
 */
export async function analyzeInvoiceImage(imageBase64: string): Promise<InvoiceAIResult | null> {
  console.log("[AI] Starting invoice analysis for accounting data extraction...");

  const response = await callOpenRouter(
    [buildImageMessage(INVOICE_ANALYSIS_PROMPT, imageBase64)],
    {
      maxTokens: 8192, // Plus de tokens pour extraction complète
      temperature: 0.1, // Température basse pour précision maximale
    }
  );

  if (!response) {
    console.error("[AI] No response from OpenRouter");
    return null;
  }

  console.log("[AI] Raw response length:", response.length);
  console.log("[AI] Response preview:", response.substring(0, 500));

  const parsed = parseAIResponse(response);

  if (!parsed) {
    console.error("[AI] Failed to parse response");
    console.error("[AI] Full response:", response);
    return null;
  }

  console.log("[AI] Analysis complete:", {
    is_invoice: parsed.is_invoice,
    type_document: parsed.type_document,
    fournisseur: parsed.fournisseur,
    montant_total: parsed.montant_total,
    articles_count: parsed.articles?.length ?? 0,
  });

  return normalizeInvoiceData(parsed);
}

/**
 * Analyze a PDF document (converted to images)
 */
export async function analyzePDFImages(imagePages: string[]): Promise<InvoiceAIResult | null> {
  console.log(`[AI] Starting PDF analysis (${imagePages.length} pages)...`);

  if (imagePages.length === 0) {
    console.error("[AI] No pages to analyze");
    return null;
  }

  // For single page, analyze directly
  if (imagePages.length === 1) {
    return analyzeInvoiceImage(imagePages[0]);
  }

  // For multi-page, analyze first page primarily
  // Could be enhanced to merge results from multiple pages
  const result = await analyzeInvoiceImage(imagePages[0]);

  if (result) {
    result.ai_comment = `${result.ai_comment || ""} [Document de ${imagePages.length} pages - première page analysée]`.trim();
  }

  return result;
}

/**
 * Chat with AI about an invoice
 */
export async function chatWithInvoice(
  message: string,
  context: ChatContext,
  forceReanalyze: boolean = false
): Promise<{ response: string; updatedData: InvoiceAIResult | null }> {
  console.log("[AI] Chat message received:", message.substring(0, 100));

  const messages: OpenRouterMessage[] = [];

  // Build system prompt with invoice context
  const systemPrompt = CHAT_SYSTEM_PROMPT.replace(
    "{INVOICE_DATA}",
    JSON.stringify(context.invoiceData, null, 2)
  );
  messages.push(buildTextMessage("system", systemPrompt));

  // Add conversation history
  for (const msg of context.conversationHistory) {
    messages.push(buildTextMessage(msg.role, msg.content));
  }

  // Handle reanalysis request
  if (forceReanalyze && context.imageBase64) {
    const reanalysisPrompt = REANALYSIS_PROMPT
      .replace("{USER_MESSAGE}", message)
      .replace("{CURRENT_DATA}", JSON.stringify(context.invoiceData, null, 2));

    messages.push(buildImageMessage(reanalysisPrompt, context.imageBase64));
  } else {
    // Regular chat message
    messages.push(buildTextMessage("user", message));
  }

  const response = await callOpenRouter(messages, {
    maxTokens: 4096,
    temperature: forceReanalyze ? 0.3 : 0.7,
  });

  if (!response) {
    return {
      response: "Désolé, je n'ai pas pu traiter votre message. Veuillez réessayer.",
      updatedData: null,
    };
  }

  // Check if response contains updated data
  const updatedData = extractModifiedDataFromChat(response);
  const cleanedResponse = cleanChatResponse(response);

  return {
    response: cleanedResponse,
    updatedData: updatedData ? normalizeInvoiceData(updatedData) : null,
  };
}

// Re-export types and utilities
export * from "./types.js";
export * from "./prompts.js";
export { parseAIResponse, normalizeInvoiceData } from "./parser.js";
