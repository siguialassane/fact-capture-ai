/**
 * OpenRouter Service - Interface unifiée pour l'analyse IA via Backend
 * 
 * Ce module fait le pont entre le Frontend et le Backend pour:
 * - L'analyse de factures (images et PDF)
 * - Le chat contextuel avec l'IA
 * 
 * Toutes les requêtes passent par le Backend API (Hono)
 */

import { backendApi, type InvoiceAIResult as BackendInvoiceAIResult } from "./api";

// Re-export types pour compatibilité - étend le type backend avec champs spécifiques frontend
export interface FlexibleInvoiceAIResult extends BackendInvoiceAIResult {
  // Champs étendus pour le frontend
  type_facture?: string;
  devise_origine?: string;
  montant_fcfa?: string;
  total_tva?: string;
  tva_details?: Array<{ taux: string; base_ht: string; montant_tva: string }>;
  anomalies?: string[];
  donnees_manquantes?: string[];
  infos_complementaires?: Record<string, string>;
}

// Type contexte chat compatible avec le backend
export interface ChatContext {
  invoiceData: FlexibleInvoiceAIResult;
  imageBase64: string | null;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * Vérifie si le backend est configuré
 */
export function isOpenRouterConfigured(): boolean {
  return true; // Le backend gère la configuration
}

/**
 * Analyse une image de facture via le backend
 */
export async function analyzeInvoiceImage(imageBase64: string): Promise<FlexibleInvoiceAIResult | null> {
  console.log("[AI] Analyse via backend API...");
  const result = await backendApi.analyzeImage(imageBase64, false);
  return result as FlexibleInvoiceAIResult | null;
}

/**
 * Analyse un document PDF via le backend
 */
export async function analyzePDFDocument(pdfBase64: string): Promise<FlexibleInvoiceAIResult | null> {
  console.log("[AI] Analyse PDF via backend API...");
  const result = await backendApi.analyzeImage(pdfBase64, true);
  return result as FlexibleInvoiceAIResult | null;
}

/**
 * Chat avec l'IA à propos d'une facture
 */
export async function chatWithInvoiceContext(
  message: string,
  context: ChatContext,
  forceReanalyze: boolean = false
): Promise<string> {
  console.log("[AI] Chat via backend API...");
  const { response, updatedData } = await backendApi.chat(message, context, forceReanalyze);
  
  // Si les données ont été mises à jour, émettre un événement
  if (updatedData) {
    window.dispatchEvent(new CustomEvent("invoice-data-updated", { 
      detail: updatedData 
    }));
  }
  
  return response;
}

/**
 * Vérifie la santé du backend
 */
export async function checkBackendHealth(): Promise<{
  available: boolean;
  ready: boolean;
}> {
  try {
    const isHealthy = await backendApi.healthCheck();
    if (!isHealthy) {
      return { available: false, ready: false };
    }
    
    const { ready } = await backendApi.readyCheck();
    return { available: true, ready };
  } catch {
    return { available: false, ready: false };
  }
}

// Export backend API pour accès direct si besoin
export { backendApi };
