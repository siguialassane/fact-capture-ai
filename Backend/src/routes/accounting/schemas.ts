import { z } from "zod";

export const GenerateEntrySchema = z.object({
  invoiceData: z.record(z.any()), // FlexibleInvoiceAIResult
  invoiceId: z.number().optional(), // ID de la facture source
  statutPaiement: z.enum(["paye", "non_paye", "partiel", "inconnu"]).optional(),
  montantPartiel: z.number().optional(),
  model: z.enum(["google/gemini-2.5-flash", "google/gemini-3-flash-preview"]).optional(), // Modèle IA
});

export const RefineEntrySchema = z.object({
  previousEntry: z.object({
    date_piece: z.string(),
    numero_piece: z.string(),
    journal_code: z.string(),
    journal_libelle: z.string(),
    libelle_general: z.string(),
    tiers_code: z.string().optional(),
    tiers_nom: z.string().optional(),
    lignes: z.array(z.object({
      numero_compte: z.string(),
      libelle_compte: z.string(),
      libelle_ligne: z.string(),
      debit: z.number(),
      credit: z.number(),
      tiers_code: z.string().optional(),
    })),
    total_debit: z.number(),
    total_credit: z.number(),
    equilibre: z.boolean(),
    commentaires: z.string().optional(),
    reasoning: z.string().optional(),
  }),
  userFeedback: z.string(),
  originalInvoiceData: z.record(z.any()),
  model: z.enum(["google/gemini-2.5-flash", "google/gemini-3-flash-preview"]).optional(), // Modèle IA
});

export const SaveEntrySchema = z.object({
  ecriture: z.object({
    date_piece: z.string(),
    numero_piece: z.string(),
    journal_code: z.string(),
    journal_libelle: z.string().optional(),
    libelle_general: z.string(),
    tiers_code: z.string().optional(),
    tiers_nom: z.string().optional(),
    lignes: z.array(z.object({
      numero_compte: z.string(),
      libelle_compte: z.string().optional(),
      libelle_ligne: z.string(),
      debit: z.number(),
      credit: z.number(),
      tiers_code: z.string().optional(),
    })),
    total_debit: z.number(),
    total_credit: z.number(),
    equilibre: z.boolean(),
    commentaires: z.string().optional(),
    reasoning: z.string().optional(),
  }),
  invoiceId: z.number().optional(),
  iaModel: z.string().optional(),
  iaReasoning: z.string().optional(),
  iaSuggestions: z.array(z.string()).optional(),
});

export const ChatSchema = z.object({
  message: z.string(),
  entry: z.object({
    date_piece: z.string(),
    numero_piece: z.string(),
    journal_code: z.string(),
    journal_libelle: z.string().optional(),
    libelle_general: z.string(),
    tiers_nom: z.string().optional(),
    lignes: z.array(z.object({
      numero_compte: z.string(),
      libelle_compte: z.string().optional(),
      libelle_ligne: z.string(),
      debit: z.number(),
      credit: z.number(),
    })),
    total_debit: z.number(),
    total_credit: z.number(),
    equilibre: z.boolean(),
  }),
});
