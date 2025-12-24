/**
 * Types pour le Lettrage
 * Rapprochement des factures et règlements
 */

/** Code lettre (A, B, C, ... Z, AA, AB, ...) */
export type LettreCode = string;

/** Statut de lettrage */
export type LettrageStatut = "non_lettre" | "partiellement_lettre" | "lettre";

/** Ligne de lettrage */
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
  montant: number; // Positif si débit, négatif si crédit (pour calcul)
  lettre?: LettreCode;
  date_lettrage?: string;
  solde_non_lettre: number;
}

/** Groupe de lettrage */
export interface GroupeLettrage {
  lettre: LettreCode;
  compte: string;
  tiers_code?: string;
  tiers_nom?: string;
  lignes: LigneLettrable[];
  total_debit: number;
  total_credit: number;
  ecart: number; // Doit être 0 si lettrage correct
  date_lettrage: string;
  created_by?: string;
}

/** Proposition de lettrage automatique */
export interface PropositionLettrage {
  compte: string;
  tiers_code?: string;
  lignes_debit: LigneLettrable[];
  lignes_credit: LigneLettrable[];
  montant_rapprochable: number;
  ecart: number;
  confiance: number; // 0-100% de confiance dans la proposition
  raison: string; // Explication (même montant, même référence, etc.)
}

/** Résultat d'une opération de lettrage */
export interface LettrageResult {
  success: boolean;
  lettre?: LettreCode;
  lignes_lettrees?: number[];
  ecart?: number;
  error?: string;
}

/** Filtre pour recherche de lignes à lettrer */
export interface LettreFilter {
  compte_debut?: string;
  compte_fin?: string;
  tiers_code?: string;
  date_debut?: string;
  date_fin?: string;
  statut?: LettrageStatut;
  journal_code?: string;
}

/** Historique de lettrage */
export interface LettrageHistory {
  id: number;
  lettre: LettreCode;
  action: "lettrage" | "delettrage";
  lignes_ids: number[];
  compte: string;
  montant: number;
  created_at: string;
  created_by?: string;
  commentaire?: string;
}

/** Suggestion IA pour le lettrage */
export interface LettrageSuggestionIA {
  facture_id: number;
  facture_numero: string;
  facture_montant: number;
  reglement_id: number;
  reglement_numero: string;
  reglement_montant: number;
  ecart: number;
  confiance: number;
  explication: string;
}

/**
 * Génère le prochain code lettre
 * A, B, C, ... Z, AA, AB, ... AZ, BA, ...
 */
export function nextLettre(current?: LettreCode): LettreCode {
  if (!current) return "A";
  
  const chars = current.split("");
  let i = chars.length - 1;
  
  while (i >= 0) {
    if (chars[i] === "Z") {
      chars[i] = "A";
      i--;
    } else {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
      return chars.join("");
    }
  }
  
  // Si on arrive ici, on ajoute un caractère (ZZ -> AAA)
  return "A" + chars.join("");
}

/**
 * Vérifie si un groupe de lignes peut être lettré (somme = 0)
 */
export function canLettrer(lignes: LigneLettrable[]): boolean {
  const total = lignes.reduce((sum, l) => sum + l.debit - l.credit, 0);
  // Tolérance de 0.01 pour les erreurs d'arrondi
  return Math.abs(total) < 0.01;
}

/**
 * Calcule l'écart d'un groupe de lettrage
 */
export function calculEcart(lignes: LigneLettrable[]): number {
  return lignes.reduce((sum, l) => sum + l.debit - l.credit, 0);
}
