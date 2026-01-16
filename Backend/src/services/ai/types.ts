import { z } from "zod";

/**
 * Article schema - Version complète avec tous les champs du tableau
 */
export const ArticleSchema = z.object({
  designation: z.string().optional().default(""),
  quantite: z.string().optional().default(""),
  unite: z.string().optional(), // Unité de mesure (kg, l, m², pièce, J, Ft...)
  prix_unitaire: z.string().optional().default(""), // PU TTC
  prix_unitaire_ht: z.string().optional(), // PU HT
  taux_tva: z.string().optional(), // Taux TVA (ex: "20%")
  montant_tva: z.string().optional(), // Montant TVA de la ligne
  montant_ht: z.string().optional().default(""), // Montant HT de la ligne
  total: z.string().optional(), // Montant TTC ou final de la ligne
});

/**
 * Invoice AI Result schema - Version complète avec tous les champs
 */
export const InvoiceAIResultSchema = z.object({
  is_invoice: z.boolean().default(true),
  type_document: z.string().optional().default(""),
  type_facture: z.string().optional(),
  
  // Fournisseur
  fournisseur: z.string().optional().default(""),
  adresse_fournisseur: z.string().optional(),
  telephone_fournisseur: z.string().optional(),
  email_fournisseur: z.string().optional(),
  rccm_fournisseur: z.string().optional(),
  ncc_fournisseur: z.string().optional(),
  siret_fournisseur: z.string().optional(),
  tva_intracom: z.string().optional(),
  
  // Client
  client: z.string().optional(),
  adresse_client: z.string().optional(),
  numero_client: z.string().optional(),
  
  // Références
  numero_facture: z.string().optional().default(""),
  date_facture: z.string().optional().default(""),
  date_echeance: z.string().optional(),
  numero_commande: z.string().optional(),
  
  // Articles
  articles: z.array(ArticleSchema).default([]),
  
  // Montants détaillés
  sous_total_ht: z.string().optional(),
  remise: z.string().optional(),
  remise_montant: z.string().optional(),
  frais_port: z.string().optional(),
  
  total_ht: z.string().optional(),
  total_tva: z.string().optional(),
  tva: z.string().optional().default(""),
  montant_total: z.string().optional().default(""),
  
  // Devises
  devise: z.string().optional(),
  devise_origine: z.string().optional(),
  montant_fcfa: z.string().optional(),
  
  // Paiements
  acompte: z.string().optional(),
  montant_paye: z.string().optional(),
  reste_a_payer: z.string().optional(),
  
  mode_paiement: z.string().optional(),
  conditions_paiement: z.string().optional(),
  rib_iban: z.string().optional(),
  
  // Divers
  notes: z.string().optional(),
  ai_comment: z.string().optional().default(""),
  anomalies: z.array(z.string()).optional(),
  extra_fields: z.record(z.string()).optional(),
});

export type Article = z.infer<typeof ArticleSchema>;
export type InvoiceAIResult = z.infer<typeof InvoiceAIResultSchema>;

/**
 * Chat context for conversation with AI
 */
export interface ChatContext {
  invoiceData: InvoiceAIResult;
  imageBase64: string | null;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * OpenRouter message format
 */
export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{
    type: "text" | "image_url";
    text?: string;
    image_url?: { url: string };
  }>;
}

/**
 * OpenRouter API response
 */
export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Analysis request schema
 */
export const AnalyzeImageRequestSchema = z.object({
  imageBase64: z.string().min(1, "Image base64 is required"),
  isPdf: z.boolean().optional().default(false),
});

export const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  invoiceData: z.record(z.any()), // Flexible - accepte n'importe quel objet
  imageBase64: z.string().nullable().optional(),
  conversationHistory: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ).optional().default([]),
  forceReanalyze: z.boolean().optional().default(false),
});

export type AnalyzeImageRequest = z.infer<typeof AnalyzeImageRequestSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
