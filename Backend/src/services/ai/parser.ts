import type { InvoiceAIResult } from "./types";

/**
 * Parse AI response to extract JSON
 */
export function parseAIResponse(response: string): InvoiceAIResult | null {
  try {
    // Try to extract JSON from markdown code block
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }

    // Try to find JSON object directly
    const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      return JSON.parse(jsonObjectMatch[0]);
    }

    // Try parsing the whole response as JSON
    return JSON.parse(response);
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    console.debug("Raw response:", response);
    return null;
  }
}

/**
 * Extract modified data from chat response
 */
export function extractModifiedDataFromChat(response: string): InvoiceAIResult | null {
  // Look for JSON in code blocks
  const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1].trim());
      // Validate it looks like invoice data
      if (typeof parsed === "object" && ("is_invoice" in parsed || "fournisseur" in parsed)) {
        return parsed;
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  return null;
}

/**
 * Clean chat response for display
 * Removes JSON blocks that were used for data updates
 */
export function cleanChatResponse(response: string): string {
  // Remove JSON code blocks that contain invoice data
  let cleaned = response.replace(/```json\s*\{[\s\S]*?"(?:is_invoice|fournisseur|articles)"[\s\S]*?\}[\s\S]*?```/g, "");

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  // If nothing left after cleaning, provide default message
  if (!cleaned || cleaned.length < 10) {
    return "Les données ont été mises à jour selon vos instructions.";
  }

  return cleaned;
}

/**
 * Validate invoice data structure
 */
export function validateInvoiceData(data: unknown): data is InvoiceAIResult {
  if (!data || typeof data !== "object") {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // Must have is_invoice boolean (or we assume true)
  if ("is_invoice" in obj && typeof obj.is_invoice !== "boolean") {
    return false;
  }

  // Articles must be an array if present
  if ("articles" in obj && !Array.isArray(obj.articles)) {
    return false;
  }

  return true;
}

/**
 * Normalize invoice data with defaults
 */
export function normalizeInvoiceData(data: Partial<InvoiceAIResult>): InvoiceAIResult {
  return {
    is_invoice: data.is_invoice ?? true,
    type_document: data.type_document ?? "",
    type_facture: data.type_facture,
    
    // Fournisseur
    fournisseur: data.fournisseur ?? "",
    adresse_fournisseur: data.adresse_fournisseur,
    telephone_fournisseur: data.telephone_fournisseur,
    email_fournisseur: data.email_fournisseur,
    rccm_fournisseur: (data as any).rccm_fournisseur,
    ncc_fournisseur: (data as any).ncc_fournisseur,
    siret_fournisseur: data.siret_fournisseur,
    tva_intracom: data.tva_intracom,
    
    // Client
    client: data.client,
    adresse_client: data.adresse_client,
    numero_client: data.numero_client,
    
    // Références
    numero_facture: data.numero_facture ?? "",
    date_facture: data.date_facture ?? "",
    date_echeance: data.date_echeance,
    numero_commande: data.numero_commande,
    
    // Articles
    articles: data.articles ?? [],
    
    // Montants détaillés
    sous_total_ht: data.sous_total_ht,
    remise: data.remise,
    remise_montant: data.remise_montant,
    frais_port: data.frais_port,
    
    total_ht: data.total_ht,
    total_tva: data.total_tva,
    tva: data.tva ?? "",
    montant_total: data.montant_total ?? "",
    
    // Devises
    devise: data.devise,
    devise_origine: data.devise_origine,
    montant_fcfa: data.montant_fcfa,
    
    // Paiements
    acompte: data.acompte,
    montant_paye: data.montant_paye,
    reste_a_payer: data.reste_a_payer,
    
    mode_paiement: data.mode_paiement,
    conditions_paiement: data.conditions_paiement,
    rib_iban: data.rib_iban,
    
    // Divers
    notes: data.notes,
    ai_comment: data.ai_comment ?? "",
    anomalies: data.anomalies,
    extra_fields: data.extra_fields,
  };
}
