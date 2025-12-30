/**
 * Types pour le Lettrage
 */

export interface LigneLettrable {
    id: number;
    ecriture_id: number;
    numero_piece: string;
    date_piece: string;
    journal_code: string;
    numero_compte: string;
    libelle_ligne: string;
    tiers_code?: string;
    tiers_nom?: string;
    debit: number;
    credit: number;
    montant: number;
    lettre?: string;
    date_lettrage?: string;
    solde_non_lettre: number;
}

export interface GroupeLettrage {
    lettre: string;
    compte: string;
    tiers_code?: string;
    tiers_nom?: string;
    lignes: LigneLettrable[];
    total_debit: number;
    total_credit: number;
    ecart: number;
    date_lettrage: string;
}

export interface PropositionLettrage {
    compte: string;
    tiers_code?: string;
    lignes_debit: LigneLettrable[];
    lignes_credit: LigneLettrable[];
    montant_rapprochable: number;
    ecart: number;
    confiance: number;
    raison: string;
}

export interface LettrageResult {
    success: boolean;
    lettre?: string;
    lignes_lettrees?: number[];
    ecart?: number;
    error?: string;
}

export interface LettrageStats {
    nb_lignes_total: number;
    nb_lignes_lettrees: number;
    nb_lignes_non_lettrees: number;
    montant_lettre: number;
    montant_non_lettre: number;
    taux_lettrage: number;
}
