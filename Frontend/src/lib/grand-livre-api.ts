/**
 * API Client pour le Grand Livre
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

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

/**
 * Récupère la liste des comptes avec soldes
 */
export async function getComptesWithSoldes(options?: {
  classeDebut?: string;
  classeFin?: string;
  avecMouvements?: boolean;
}): Promise<GrandLivreAccount[]> {
  const params = new URLSearchParams();
  if (options?.classeDebut) params.set("classe_debut", options.classeDebut);
  if (options?.classeFin) params.set("classe_fin", options.classeFin);
  if (options?.avecMouvements) params.set("avec_mouvements", "true");

  const response = await fetch(`${BACKEND_URL}/api/grand-livre/comptes?${params}`);
  const result = await response.json();
  return result.data || [];
}

/**
 * Récupère le grand livre d'un compte
 */
export async function getGrandLivreCompte(
  numeroCompte: string,
  options?: {
    dateDebut?: string;
    dateFin?: string;
    inclureLettres?: boolean;
  }
): Promise<GrandLivreDetail | null> {
  const params = new URLSearchParams();
  if (options?.dateDebut) params.set("date_debut", options.dateDebut);
  if (options?.dateFin) params.set("date_fin", options.dateFin);
  if (options?.inclureLettres) params.set("inclure_lettres", "true");

  const response = await fetch(`${BACKEND_URL}/api/grand-livre/compte/${numeroCompte}?${params}`);
  const result = await response.json();
  
  if (!result.success) return null;
  return result.data;
}

/**
 * Récupère la balance des comptes
 */
export async function getBalance(options?: {
  dateArrete?: string;
  classeDebut?: string;
  classeFin?: string;
}): Promise<Balance> {
  const params = new URLSearchParams();
  if (options?.dateArrete) params.set("date_arrete", options.dateArrete);
  if (options?.classeDebut) params.set("classe_debut", options.classeDebut);
  if (options?.classeFin) params.set("classe_fin", options.classeFin);

  const response = await fetch(`${BACKEND_URL}/api/grand-livre/balance?${params}`);
  const result = await response.json();
  return result.data;
}

/**
 * Recherche de comptes
 */
export async function searchComptes(
  query: string,
  limit?: number
): Promise<Array<{ numero_compte: string; libelle: string }>> {
  const params = new URLSearchParams({ q: query });
  if (limit) params.set("limit", limit.toString());

  const response = await fetch(`${BACKEND_URL}/api/grand-livre/search-comptes?${params}`);
  const result = await response.json();
  return result.data || [];
}

/**
 * Recherche avancée dans le grand livre
 */
export async function searchGrandLivre(filter: {
  compte_debut?: string;
  compte_fin?: string;
  date_debut?: string;
  date_fin?: string;
  journal_code?: string;
  tiers_code?: string;
  inclure_lettres?: boolean;
}): Promise<GrandLivreEntry[]> {
  const response = await fetch(`${BACKEND_URL}/api/grand-livre/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(filter),
  });
  const result = await response.json();
  return result.data || [];
}
