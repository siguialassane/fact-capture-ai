/**
 * Types communs pour l'API Backend
 */

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    meta?: Record<string, unknown>;
}

/**
 * Invoice AI Result type (matches backend)
 */
export interface InvoiceAIResult {
    is_invoice: boolean;
    type_document?: string;
    type_facture?: string;
    fournisseur?: string;
    adresse_fournisseur?: string;
    telephone_fournisseur?: string;
    email_fournisseur?: string;
    client?: string;
    adresse_client?: string;
    numero_facture?: string;
    date_facture?: string;
    date_echeance?: string;
    articles: Array<{
        designation?: string;
        quantite?: string;
        unite?: string;
        prix_unitaire?: string;
        prix_unitaire_ht?: string;
        montant_ht?: string;
        taux_tva?: string;
        montant_tva?: string;
        montant_ttc?: string;
        total?: string;
    }>;
    total_ht?: string;
    tva?: string;
    total_tva?: string;
    remise?: string;
    montant_total?: string;
    devise?: string;
    mode_paiement?: string;
    conditions_paiement?: string;
    numero_commande?: string;
    notes?: string;
    ai_comment?: string;
    extra_fields?: Record<string, string>;
    tva_details?: Array<{ taux: string; base_ht: string; montant_tva: string }>;
    donnees_manquantes?: string[];
    infos_complementaires?: Record<string, string>;
}

/**
 * Chat context for AI conversations
 */
export interface ChatContext {
    invoiceData: InvoiceAIResult;
    imageBase64: string | null;
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}
