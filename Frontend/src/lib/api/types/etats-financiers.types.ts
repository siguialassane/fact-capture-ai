/**
 * Types pour les États Financiers
 */

export interface LigneBilan {
    compte: string;
    libelle: string;
    montant: number;
}

export interface SectionBilan {
    total: number;
    lignes: LigneBilan[];
}

export interface Bilan {
    exercice: string;
    actif_immobilise: SectionBilan;
    actif_circulant: SectionBilan;
    tresorerie_actif: number;
    total_actif: number;
    capitaux_propres: SectionBilan;
    dettes: SectionBilan;
    tresorerie_passif: number;
    total_passif: number;
}

export interface LigneResultat {
    compte: string;
    libelle: string;
    montant: number;
}

export interface CompteResultat {
    exercice: string;
    charges: LigneResultat[];
    produits: LigneResultat[];
    total_charges: number;
    total_produits: number;
    resultat_net: number;
}

export interface Indicateurs {
    exercice: string;
    marge_brute: number;
    marge_nette: number;
    roe: number;
    ratio_liquidite: number;
    bfr: number;
    tresorerie_nette: number;
    taux_endettement: number;
    autonomie_financiere: number;
    delai_client: number;
    delai_fournisseur: number;
    rotation_stocks: number;
}
