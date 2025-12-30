/**
 * Types pour les journaux comptables
 */

export type JournalCode = "AC" | "VE" | "BQ" | "CA" | "OD";

export interface JournalConfig {
    code: JournalCode;
    libelle: string;
    description: string;
    type_operation: string;
    compte_contrepartie?: string;
    prefixe_piece: string;
}

export interface JournalSummary {
    journal_code: JournalCode;
    journal_libelle: string;
    periode: string;
    nb_ecritures: number;
    total_debit: number;
    total_credit: number;
    premiere_piece: string;
    derniere_piece: string;
}

/**
 * Structure d'une écriture dans un journal (avec statut)
 */
export interface JournalEntryRecord {
    id: number;
    numero_piece: string;
    date_piece: string;
    journal_code: JournalCode;
    libelle_general: string;
    tiers_code?: string;
    tiers_nom?: string;
    total_debit: number;
    total_credit: number;
    equilibre: boolean;
    statut: "brouillon" | "validee" | "cloturee";
    lignes: Array<{
        numero_compte: string;
        libelle_compte?: string;
        libelle_ligne: string;
        debit: number;
        credit: number;
    }>;
}

/**
 * Infos supplémentaires pour la régénération
 */
export interface RegenerateAdditionalInfo {
    new_tiers_name?: string;
    new_tiers_type: "client" | "fournisseur";
    payment_mode: "especes" | "carte_bancaire" | "virement" | "cheque" | "credit";
    reason: string;
}

/**
 * Ligne d'écriture régénérée
 */
export interface RegeneratedLine {
    numero_compte: string;
    libelle_compte: string;
    libelle_ligne: string;
    debit: number;
    credit: number;
}

/**
 * Écriture régénérée par l'IA
 */
export interface RegeneratedEntry {
    date_piece: string;
    numero_piece: string;
    journal_code: JournalCode;
    journal_libelle: string;
    libelle_general: string;
    tiers_code?: string;
    tiers_nom?: string;
    lignes: RegeneratedLine[];
    total_debit: number;
    total_credit: number;
    equilibre: boolean;
    commentaires?: string;
}

/**
 * Résultat de la régénération
 */
export interface RegenerateResult {
    proposed_entry: RegeneratedEntry;
    reasoning: string;
    changes_summary: {
        old_journal: JournalCode;
        new_journal: JournalCode;
        old_tiers?: string;
        new_tiers?: string;
        accounts_changed: number;
    };
}

/**
 * Mapping des contreparties par journal
 */
export const JOURNAL_CONTREPARTIE: Record<JournalCode, { compte: string; libelle: string }> = {
    AC: { compte: "4011", libelle: "Fournisseurs" },
    VE: { compte: "4111", libelle: "Clients" },
    BQ: { compte: "5211", libelle: "Banque" },
    CA: { compte: "571", libelle: "Caisse" },
    OD: { compte: "", libelle: "Divers" },
};
