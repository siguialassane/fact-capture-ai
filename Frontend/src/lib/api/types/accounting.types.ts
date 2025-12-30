/**
 * Types pour la comptabilité
 */

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
 * Structure d'une écriture comptable pour la génération
 */
export interface AccountingEntry {
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
        ecriture: AccountingEntry;
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
 * Statut de paiement
 */
export type StatutPaiement = "paye" | "non_paye" | "partiel" | "inconnu";

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
