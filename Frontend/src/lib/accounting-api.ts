/**
 * Accounting API Client
 * 
 * Client pour communiquer avec l'API d'écritures comptables
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

/**
 * Structure d'une ligne d'écriture comptable
 */
export interface JournalEntryLine {
  numero_compte: string;
  libelle_compte: string;
  libelle_ligne: string;
  debit: number;
  credit: number;
  tiers_code?: string;
}

/**
 * Structure d'une écriture comptable complète
 */
export interface JournalEntry {
  date_piece: string;
  numero_piece: string;
  journal_code: string;
  journal_libelle: string;
  libelle_general: string;
  tiers_code?: string;
  tiers_nom?: string;
  lignes: JournalEntryLine[];
  total_debit: number;
  total_credit: number;
  equilibre: boolean;
  commentaires?: string;
  reasoning?: string;
}

/**
 * Résultat de la génération comptable
 */
export interface AccountingResult {
  success: boolean;
  data?: {
    ecriture: JournalEntry;
    reasoning?: {
      thinking_content: string;
      duration_ms?: number;
    };
    suggestions?: string[];
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * État de l'écriture comptable
 */
export type AccountingStatus = "idle" | "generating" | "ready" | "error" | "refining";

/**
 * Génère une écriture comptable à partir des données de facture
 */
export async function generateAccountingEntry(invoiceData: Record<string, unknown>): Promise<AccountingResult> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/accounting/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ invoiceData }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("[Accounting Client] Erreur:", error);
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Erreur de connexion au serveur",
        details: error,
      },
    };
  }
}

/**
 * Affine une écriture comptable avec feedback
 */
export async function refineAccountingEntry(
  previousEntry: JournalEntry,
  userFeedback: string,
  originalInvoiceData: Record<string, unknown>
): Promise<AccountingResult> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/accounting/refine`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        previousEntry,
        userFeedback,
        originalInvoiceData,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("[Accounting Client] Erreur:", error);
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Erreur de connexion au serveur",
        details: error,
      },
    };
  }
}

/**
 * Récupère le plan comptable simplifié
 */
export async function getPlanComptable(): Promise<Record<string, Array<{ numero: string; libelle: string }>>> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/accounting/plan-comptable`);
    const result = await response.json();
    return result.data || {};
  } catch (error) {
    console.error("[Accounting Client] Erreur récupération plan comptable:", error);
    return {};
  }
}

/**
 * Résultat de la sauvegarde
 */
export interface SaveResult {
  success: boolean;
  data?: {
    entryId: string;
    message: string;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Sauvegarde une écriture comptable dans la base de données
 */
export async function saveAccountingEntry(
  ecriture: JournalEntry,
  options?: {
    invoiceId?: number;
    iaModel?: string;
    iaReasoning?: string;
    iaSuggestions?: string[];
  }
): Promise<SaveResult> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/accounting/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ecriture,
        invoiceId: options?.invoiceId,
        iaModel: options?.iaModel,
        iaReasoning: options?.iaReasoning,
        iaSuggestions: options?.iaSuggestions,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("[Accounting Client] Erreur sauvegarde:", error);
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Erreur de connexion au serveur",
        details: error,
      },
    };
  }
}

/**
 * Récupère les factures en doublon potentiel
 */
export async function getDuplicates(): Promise<unknown[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/accounting/duplicates`);
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("[Accounting Client] Erreur récupération doublons:", error);
    return [];
  }
}

/**
 * Récupère la liste des tiers
 */
export async function getTiers(type?: "fournisseur" | "client"): Promise<unknown[]> {
  try {
    const url = type
      ? `${BACKEND_URL}/api/accounting/tiers?type=${type}`
      : `${BACKEND_URL}/api/accounting/tiers`;
    const response = await fetch(url);
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("[Accounting Client] Erreur récupération tiers:", error);
    return [];
  }
}

/**
 * Chat avec Gemini à propos d'une écriture comptable
 */
export async function chatAboutEntry(
  message: string,
  entry: JournalEntry
): Promise<{ success: boolean; reply?: string; error?: string }> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/accounting/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, entry }),
    });

    const result = await response.json();

    if (result.success) {
      return { success: true, reply: result.data.reply };
    } else {
      return { success: false, error: result.error?.message || "Erreur inconnue" };
    }
  } catch (error) {
    console.error("[Accounting Client] Erreur chat:", error);
    return { success: false, error: "Erreur de connexion au serveur" };
  }
}
