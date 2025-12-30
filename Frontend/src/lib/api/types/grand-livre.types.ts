/**
 * Types pour le Grand Livre
 */

export interface GrandLivreEntry {
    id: number;
    date_piece: string;
    numero_piece: string;
    journal_code: string;
    libelle_ligne: string;
    tiers_code?: string;
    tiers_nom?: string;
    debit: number;
    credit: number;
    solde_cumule: number;
    lettre?: string;
    ecriture_id: number;
}

export interface GrandLivreAccount {
    numero_compte: string;
    libelle_compte: string;
    classe: string;
    total_debit: number;
    total_credit: number;
    solde: number;
    sens_solde: "debiteur" | "crediteur" | "nul";
    nb_mouvements: number;
}

export interface GrandLivreDetail {
    compte: GrandLivreAccount;
    mouvements: GrandLivreEntry[];
    solde_ouverture: number;
    solde_cloture: number;
}

export interface BalanceEntry {
    numero_compte: string;
    libelle_compte: string;
    mouvement_debit: number;
    mouvement_credit: number;
    solde_debit: number;
    solde_credit: number;
}

export interface Balance {
    exercice: string;
    date_arrete: string;
    comptes: BalanceEntry[];
    total_mouvement_debit: number;
    total_mouvement_credit: number;
    total_solde_debit: number;
    total_solde_credit: number;
}
