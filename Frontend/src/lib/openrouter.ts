/**
 * OpenRouter Module - Main entry point
 * 
 * This module re-exports the unified interface that automatically
 * chooses between direct OpenRouter API calls or backend API based
 * on configuration (VITE_USE_BACKEND environment variable).
 * 
 * Usage:
 * ```typescript
 * import { analyzeInvoiceImage, isOpenRouterConfigured } from "@/lib/openrouter";
 * 
 * if (isOpenRouterConfigured()) {
 *   const result = await analyzeInvoiceImage(imageBase64);
 * }
 * ```
 */

// Re-export everything from the unified module
export {
  // Functions
  analyzeInvoiceImage,
  analyzePDFDocument,
  chatWithInvoiceContext,
  isOpenRouterConfigured,
  checkBackendHealth,
  
  // Types
  type FlexibleInvoiceAIResult,
  type ChatContext,
  
  // Backend API (for direct access when needed)
  backendApi,
} from "./openrouter-unified";

// Also export InvoiceAIResult as an alias for compatibility
export type { FlexibleInvoiceAIResult as InvoiceAIResult } from "./openrouter-unified";
