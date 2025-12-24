/**
 * Types pour le Grand Livre
 * Agrégation des mouvements par compte avec calcul des soldes
 */

/** Ligne du grand livre (mouvement sur un compte) */
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
  solde_cumule: number; // Solde après ce mouvement
  lettre?: string; // Code lettrage si lettré
  ecriture_id: number;
}

/** Compte avec son solde dans le grand livre */
export interface GrandLivreAccount {
  numero_compte: string;
  libelle_compte: string;
  classe: string; // 1-8
  total_debit: number;
  total_credit: number;
  solde: number; // Débit - Crédit (positif = débiteur)
  sens_solde: "debiteur" | "crediteur" | "nul";
  nb_mouvements: number;
}

/** Grand livre complet d'un compte */
export interface GrandLivreDetail {
  compte: GrandLivreAccount;
  mouvements: GrandLivreEntry[];
  solde_ouverture: number;
  solde_cloture: number;
}

/** Filtre pour requête grand livre */
export interface GrandLivreFilter {
  compte_debut?: string;
  compte_fin?: string;
  date_debut?: string;
  date_fin?: string;
  journal_code?: string;
  exercice?: string;
  inclure_lettres?: boolean;
  tiers_code?: string;
}

/** Balance des comptes (résumé) */
export interface BalanceEntry {
  numero_compte: string;
  libelle_compte: string;
  mouvement_debit: number;
  mouvement_credit: number;
  solde_debit: number;
  solde_credit: number;
}

/** Balance générale */
export interface Balance {
  exercice: string;
  date_arrete: string;
  comptes: BalanceEntry[];
  total_mouvement_debit: number;
  total_mouvement_credit: number;
  total_solde_debit: number;
  total_solde_credit: number;
}

/** Calcul du sens du solde selon la classe de compte */
export function getSensSolde(
  numeroCompte: string,
  solde: number
): "debiteur" | "crediteur" | "nul" {
  if (solde === 0) return "nul";
  
  const classe = numeroCompte.charAt(0);
  
  // Classes normalement débitrices: 2 (Immo), 3 (Stocks), 5 (Tréso actif), 6 (Charges)
  // Classes normalement créditrices: 1 (Capitaux), 4 (Tiers passif), 7 (Produits)
  
  if (solde > 0) {
    return "debiteur";
  } else {
    return "crediteur";
  }
}

/** Obtenir la classe d'un compte */
export function getClasseCompte(numeroCompte: string): string {
  return numeroCompte.charAt(0);
}

/** Vérifier si un compte est de tiers (classe 4) */
export function isCompteTiers(numeroCompte: string): boolean {
  return numeroCompte.startsWith("4");
}

/** Vérifier si un compte est fournisseur */
export function isCompteFournisseur(numeroCompte: string): boolean {
  return numeroCompte.startsWith("401");
}

/** Vérifier si un compte est client */
export function isCompteClient(numeroCompte: string): boolean {
  return numeroCompte.startsWith("411");
}
