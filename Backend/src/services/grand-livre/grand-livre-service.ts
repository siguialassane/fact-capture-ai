/**
 * Service Grand Livre
 * 
 * Responsabilités :
 * - Consultation des mouvements par compte
 * - Calcul des soldes cumulés
 * - Balance des comptes
 */

import { getSupabase } from "../../lib/supabase";
import {
  type GrandLivreEntry,
  type GrandLivreAccount,
  type GrandLivreDetail,
  type GrandLivreFilter,
  type Balance,
  type BalanceEntry,
  getSensSolde,
} from "./types";

export * from "./types";

/**
 * Récupère le grand livre d'un compte spécifique
 */
export async function getGrandLivreCompte(
  numeroCompte: string,
  options?: {
    dateDebut?: string;
    dateFin?: string;
    inclureLettres?: boolean;
  }
): Promise<GrandLivreDetail | null> {
  let query = getSupabase()
    .from("vue_grand_livre")
    .select("*")
    .eq("numero_compte", numeroCompte);

  if (options?.dateDebut) {
    query = query.gte("date_piece", options.dateDebut);
  }
  if (options?.dateFin) {
    query = query.lte("date_piece", options.dateFin);
  }
  if (!options?.inclureLettres) {
    query = query.is("lettre", null);
  }

  const { data, error } = await query.order("date_piece").order("ecriture_id");

  if (error) {
    console.error("[GrandLivre] Erreur récupération compte:", error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Calculer les totaux
  let totalDebit = 0;
  let totalCredit = 0;
  
  const mouvements: GrandLivreEntry[] = data.map((row) => {
    totalDebit += parseFloat(row.debit) || 0;
    totalCredit += parseFloat(row.credit) || 0;
    
    return {
      id: row.id,
      date_piece: row.date_piece,
      numero_piece: row.numero_piece,
      journal_code: row.journal_code,
      libelle_ligne: row.libelle_ligne,
      tiers_code: row.tiers_code,
      tiers_nom: row.tiers_nom,
      debit: parseFloat(row.debit) || 0,
      credit: parseFloat(row.credit) || 0,
      solde_cumule: parseFloat(row.solde_cumule) || 0,
      lettre: row.lettre,
      ecriture_id: row.ecriture_id,
    };
  });

  const solde = totalDebit - totalCredit;

  return {
    compte: {
      numero_compte: numeroCompte,
      libelle_compte: data[0].libelle_compte || numeroCompte,
      classe: data[0].classe || numeroCompte.charAt(0),
      total_debit: totalDebit,
      total_credit: totalCredit,
      solde: solde,
      sens_solde: getSensSolde(numeroCompte, solde),
      nb_mouvements: mouvements.length,
    },
    mouvements,
    solde_ouverture: 0, // À implémenter avec exercices
    solde_cloture: solde,
  };
}

/**
 * Recherche dans le grand livre avec filtres
 */
export async function searchGrandLivre(
  filter: GrandLivreFilter
): Promise<GrandLivreEntry[]> {
  let query = getSupabase().from("vue_grand_livre").select("*");

  if (filter.compte_debut) {
    query = query.gte("numero_compte", filter.compte_debut);
  }
  if (filter.compte_fin) {
    query = query.lte("numero_compte", filter.compte_fin);
  }
  if (filter.date_debut) {
    query = query.gte("date_piece", filter.date_debut);
  }
  if (filter.date_fin) {
    query = query.lte("date_piece", filter.date_fin);
  }
  if (filter.journal_code) {
    query = query.eq("journal_code", filter.journal_code);
  }
  if (filter.tiers_code) {
    query = query.eq("tiers_code", filter.tiers_code);
  }
  if (!filter.inclure_lettres) {
    query = query.is("lettre", null);
  }

  const { data, error } = await query
    .order("numero_compte")
    .order("date_piece")
    .limit(1000);

  if (error) {
    console.error("[GrandLivre] Erreur recherche:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    date_piece: row.date_piece,
    numero_piece: row.numero_piece,
    journal_code: row.journal_code,
    libelle_ligne: row.libelle_ligne,
    tiers_code: row.tiers_code,
    tiers_nom: row.tiers_nom,
    debit: parseFloat(row.debit) || 0,
    credit: parseFloat(row.credit) || 0,
    solde_cumule: parseFloat(row.solde_cumule) || 0,
    lettre: row.lettre,
    ecriture_id: row.ecriture_id,
  }));
}

/**
 * Récupère la liste des comptes avec leurs soldes
 */
export async function getComptesWithSoldes(
  options?: {
    classeDebut?: string;
    classeFin?: string;
    avecMouvements?: boolean;
  }
): Promise<GrandLivreAccount[]> {
  const { data, error } = await getSupabase().from("vue_balance").select("*");

  if (error) {
    console.error("[GrandLivre] Erreur comptes:", error);
    return [];
  }

  let comptes = (data || []).map((row) => {
    const soldeDebit = parseFloat(row.solde_debit) || 0;
    const soldeCredit = parseFloat(row.solde_credit) || 0;
    const solde = soldeDebit - soldeCredit;

    return {
      numero_compte: row.numero_compte,
      libelle_compte: row.libelle_compte,
      classe: row.classe || row.numero_compte.charAt(0),
      total_debit: parseFloat(row.mouvement_debit) || 0,
      total_credit: parseFloat(row.mouvement_credit) || 0,
      solde: solde,
      sens_solde: getSensSolde(row.numero_compte, solde),
      nb_mouvements: 0, // Non disponible dans la vue balance
    };
  });

  // Filtrer par classe si demandé
  if (options?.classeDebut) {
    comptes = comptes.filter((c) => c.classe >= options.classeDebut!);
  }
  if (options?.classeFin) {
    comptes = comptes.filter((c) => c.classe <= options.classeFin!);
  }
  if (options?.avecMouvements) {
    comptes = comptes.filter((c) => c.total_debit > 0 || c.total_credit > 0);
  }

  return comptes.sort((a, b) => a.numero_compte.localeCompare(b.numero_compte));
}

/**
 * Génère la balance des comptes
 */
export async function getBalance(
  options?: {
    dateArrete?: string;
    classeDebut?: string;
    classeFin?: string;
  }
): Promise<Balance> {
  const { data, error } = await getSupabase().from("vue_balance").select("*");

  if (error) {
    console.error("[GrandLivre] Erreur balance:", error);
    return {
      exercice: new Date().getFullYear().toString(),
      date_arrete: options?.dateArrete || new Date().toISOString().split("T")[0],
      comptes: [],
      total_mouvement_debit: 0,
      total_mouvement_credit: 0,
      total_solde_debit: 0,
      total_solde_credit: 0,
    };
  }

  let comptes: BalanceEntry[] = (data || []).map((row) => ({
    numero_compte: row.numero_compte,
    libelle_compte: row.libelle_compte,
    mouvement_debit: parseFloat(row.mouvement_debit) || 0,
    mouvement_credit: parseFloat(row.mouvement_credit) || 0,
    solde_debit: parseFloat(row.solde_debit) || 0,
    solde_credit: parseFloat(row.solde_credit) || 0,
  }));

  // Filtrer par classe
  if (options?.classeDebut) {
    comptes = comptes.filter((c) => c.numero_compte >= options.classeDebut!);
  }
  if (options?.classeFin) {
    comptes = comptes.filter((c) => c.numero_compte <= (options.classeFin! + "Z"));
  }

  // Calculer les totaux
  const totaux = comptes.reduce(
    (acc, c) => ({
      mouvement_debit: acc.mouvement_debit + c.mouvement_debit,
      mouvement_credit: acc.mouvement_credit + c.mouvement_credit,
      solde_debit: acc.solde_debit + c.solde_debit,
      solde_credit: acc.solde_credit + c.solde_credit,
    }),
    { mouvement_debit: 0, mouvement_credit: 0, solde_debit: 0, solde_credit: 0 }
  );

  return {
    exercice: new Date().getFullYear().toString(),
    date_arrete: options?.dateArrete || new Date().toISOString().split("T")[0],
    comptes: comptes.sort((a, b) => a.numero_compte.localeCompare(b.numero_compte)),
    total_mouvement_debit: totaux.mouvement_debit,
    total_mouvement_credit: totaux.mouvement_credit,
    total_solde_debit: totaux.solde_debit,
    total_solde_credit: totaux.solde_credit,
  };
}

/**
 * Récupère le solde d'un compte à une date donnée
 */
export async function getSoldeCompteAtDate(
  numeroCompte: string,
  date: string
): Promise<{ debit: number; credit: number; solde: number }> {
  const { data, error } = await getSupabase()
    .from("vue_grand_livre")
    .select("debit, credit")
    .eq("numero_compte", numeroCompte)
    .lte("date_piece", date);

  if (error) {
    console.error("[GrandLivre] Erreur solde à date:", error);
    return { debit: 0, credit: 0, solde: 0 };
  }

  const totaux = (data || []).reduce(
    (acc, row) => ({
      debit: acc.debit + (parseFloat(row.debit) || 0),
      credit: acc.credit + (parseFloat(row.credit) || 0),
    }),
    { debit: 0, credit: 0 }
  );

  return {
    debit: totaux.debit,
    credit: totaux.credit,
    solde: totaux.debit - totaux.credit,
  };
}

/**
 * Recherche de comptes par numéro ou libellé
 */
export async function searchComptes(
  query: string,
  limit: number = 20
): Promise<Array<{ numero_compte: string; libelle: string }>> {
  const { data, error } = await getSupabase()
    .from("plan_comptable")
    .select("numero_compte, libelle")
    .or(`numero_compte.ilike.%${query}%,libelle.ilike.%${query}%`)
    .limit(limit);

  if (error) {
    console.error("[GrandLivre] Erreur recherche comptes:", error);
    return [];
  }

  return data || [];
}
