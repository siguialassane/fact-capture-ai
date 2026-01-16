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

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function mergeInvoiceResults(results: InvoiceAIResult[]): InvoiceAIResult {
  const merged: Record<string, any> = normalizeInvoiceData(results[0]);

  for (let i = 1; i < results.length; i++) {
    const current = results[i] as Record<string, any>;

    for (const [key, currentValue] of Object.entries(current)) {
      const mergedValue = merged[key];

      if (Array.isArray(currentValue)) {
        const mergedArray = Array.isArray(mergedValue) ? mergedValue : [];
        merged[key] = [...mergedArray, ...currentValue];
        continue;
      }

      if (typeof currentValue === "object" && currentValue !== null) {
        const mergedObject = typeof mergedValue === "object" && mergedValue !== null ? mergedValue : {};
        merged[key] = { ...mergedObject, ...currentValue };
        continue;
      }

      if (isEmptyValue(mergedValue) && !isEmptyValue(currentValue)) {
        merged[key] = currentValue;
      }
    }
  }

  return merged as InvoiceAIResult;
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

  const results: InvoiceAIResult[] = [];

  for (let index = 0; index < imagePages.length; index++) {
    const page = imagePages[index];
    const pageResult = await analyzeInvoiceImage(page);
    if (pageResult) {
      results.push(pageResult);
    } else {
      console.warn(`[AI] Page ${index + 1} ignorée: analyse échouée`);
    }
  }

  if (results.length === 0) {
    return null;
  }

  const merged = mergeInvoiceResults(results);
  merged.ai_comment = `${merged.ai_comment || ""} [Document de ${imagePages.length} pages - fusion automatique]`.trim();

  return merged;
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
