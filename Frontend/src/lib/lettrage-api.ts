/**
 * API Client pour le Lettrage
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

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

/**
 * Récupère les lignes à lettrer
 */
export async function getLignesALettrer(filter?: {
  compte_debut?: string;
  compte_fin?: string;
  tiers_code?: string;
  date_debut?: string;
  date_fin?: string;
  statut?: "non_lettre" | "partiellement_lettre" | "lettre";
  journal_code?: string;
}): Promise<LigneLettrable[]> {
  const params = new URLSearchParams();
  if (filter?.compte_debut) params.set("compte_debut", filter.compte_debut);
  if (filter?.compte_fin) params.set("compte_fin", filter.compte_fin);
  if (filter?.tiers_code) params.set("tiers_code", filter.tiers_code);
  if (filter?.date_debut) params.set("date_debut", filter.date_debut);
  if (filter?.date_fin) params.set("date_fin", filter.date_fin);
  if (filter?.statut) params.set("statut", filter.statut);
  if (filter?.journal_code) params.set("journal_code", filter.journal_code);

  const response = await fetch(`${BACKEND_URL}/api/lettrage/lignes?${params}`);
  const result = await response.json();
  return result.data || [];
}

/**
 * Récupère les groupes de lettrage
 */
export async function getGroupesLettrage(compte?: string): Promise<GroupeLettrage[]> {
  const url = compte 
    ? `${BACKEND_URL}/api/lettrage/groupes?compte=${compte}`
    : `${BACKEND_URL}/api/lettrage/groupes`;
  const response = await fetch(url);
  const result = await response.json();
  return result.data || [];
}

/**
 * Récupère les propositions de lettrage
 */
export async function getPropositionsLettrage(
  compte: string,
  tiersCode?: string
): Promise<PropositionLettrage[]> {
  const url = tiersCode
    ? `${BACKEND_URL}/api/lettrage/propositions/${compte}?tiers_code=${tiersCode}`
    : `${BACKEND_URL}/api/lettrage/propositions/${compte}`;
  const response = await fetch(url);
  const result = await response.json();
  return result.data || [];
}

/**
 * Récupère les statistiques de lettrage
 */
export async function getStatistiquesLettrage(compte: string): Promise<LettrageStats> {
  const response = await fetch(`${BACKEND_URL}/api/lettrage/statistiques/${compte}`);
  const result = await response.json();
  return result.data;
}

/**
 * Effectue le lettrage
 */
export async function effectuerLettrage(
  ligneIds: number[],
  compte: string,
  tiersCode?: string
): Promise<LettrageResult> {
  const response = await fetch(`${BACKEND_URL}/api/lettrage/effectuer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ligne_ids: ligneIds,
      compte,
      tiers_code: tiersCode,
    }),
  });
  const result = await response.json();
  
  if (!result.success) {
    return {
      success: false,
      error: result.error?.message || "Erreur de lettrage",
      ecart: result.error?.ecart,
    };
  }
  
  return {
    success: true,
    lettre: result.data.lettre,
    lignes_lettrees: result.data.lignes_lettrees,
  };
}

/**
 * Annule le lettrage
 */
export async function annulerLettrage(
  lettre: string,
  compte: string
): Promise<boolean> {
  const response = await fetch(`${BACKEND_URL}/api/lettrage/annuler`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lettre, compte }),
  });
  const result = await response.json();
  return result.success;
}

/**
 * Lettrage automatique
 */
export async function lettrageAuto(
  compte: string,
  options?: {
    tiersCode?: string;
    confianceMin?: number;
  }
): Promise<{
  nb_propositions: number;
  nb_lettres: number;
  nb_echecs: number;
}> {
  const response = await fetch(`${BACKEND_URL}/api/lettrage/auto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      compte,
      tiers_code: options?.tiersCode,
      confiance_min: options?.confianceMin || 90,
    }),
  });
  const result = await response.json();
  return result.data;
}
