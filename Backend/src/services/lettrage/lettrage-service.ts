/**
 * Service de Lettrage
 * 
 * Responsabilités :
 * - Rapprochement factures / règlements
 * - Suggestions automatiques
 * - Historique des opérations
 */

import { supabase } from "../../lib/supabase";
import {
  type LettreCode,
  type LigneLettrable,
  type GroupeLettrage,
  type PropositionLettrage,
  type LettrageResult,
  type LettreFilter,
  type LettrageHistory,
  canLettrer,
  calculEcart,
} from "./types";

export * from "./types";

/**
 * Récupère les lignes à lettrer pour un compte
 */
export async function getLignesALettrer(
  filter?: LettreFilter
): Promise<LigneLettrable[]> {
  let query = supabase.from("vue_lignes_a_lettrer").select("*");

  if (filter?.compte_debut) {
    query = query.gte("numero_compte", filter.compte_debut);
  }
  if (filter?.compte_fin) {
    query = query.lte("numero_compte", filter.compte_fin);
  }
  if (filter?.tiers_code) {
    query = query.eq("tiers_code", filter.tiers_code);
  }
  if (filter?.date_debut) {
    query = query.gte("date_piece", filter.date_debut);
  }
  if (filter?.date_fin) {
    query = query.lte("date_piece", filter.date_fin);
  }
  if (filter?.statut === "non_lettre") {
    query = query.is("lettre", null);
  } else if (filter?.statut === "lettre") {
    query = query.not("lettre", "is", null);
  }
  if (filter?.journal_code) {
    query = query.eq("journal_code", filter.journal_code);
  }

  const { data, error } = await query
    .order("numero_compte")
    .order("date_piece")
    .limit(500);

  if (error) {
    console.error("[Lettrage] Erreur récupération lignes:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    ecriture_id: row.ecriture_id,
    numero_piece: row.numero_piece,
    date_piece: row.date_piece,
    journal_code: row.journal_code,
    numero_compte: row.numero_compte,
    libelle_ligne: row.libelle_ligne,
    tiers_code: row.tiers_code,
    tiers_nom: row.tiers_nom,
    debit: parseFloat(row.debit) || 0,
    credit: parseFloat(row.credit) || 0,
    montant: parseFloat(row.montant) || 0,
    lettre: row.lettre,
    date_lettrage: row.date_lettrage,
    solde_non_lettre: parseFloat(row.solde_non_lettre) || parseFloat(row.montant) || 0,
  }));
}

/**
 * Effectue le lettrage d'un groupe de lignes
 */
export async function effectuerLettrage(
  ligneIds: number[],
  compte: string,
  tiersCode?: string,
  user?: string
): Promise<LettrageResult> {
  // Appeler la fonction SQL
  const { data, error } = await supabase.rpc("effectuer_lettrage", {
    p_ligne_ids: ligneIds,
    p_compte: compte,
    p_tiers_code: tiersCode || null,
    p_user: user || null,
  });

  if (error) {
    console.error("[Lettrage] Erreur:", error);
    return {
      success: false,
      error: error.message,
    };
  }

  if (!data || data.length === 0) {
    return {
      success: false,
      error: "Aucun résultat retourné",
    };
  }

  const result = data[0];
  return {
    success: result.success,
    lettre: result.lettre,
    lignes_lettrees: result.success ? ligneIds : undefined,
    ecart: parseFloat(result.ecart) || 0,
    error: result.success ? undefined : "Les lignes ne s'équilibrent pas",
  };
}

/**
 * Annule le lettrage d'un groupe
 */
export async function annulerLettrage(
  lettre: LettreCode,
  compte: string,
  user?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("effectuer_delettrage", {
    p_lettre: lettre,
    p_compte: compte,
    p_user: user || null,
  });

  if (error) {
    console.error("[Lettrage] Erreur délettrage:", error);
    return false;
  }

  return data === true;
}

/**
 * Récupère les groupes de lettrage existants
 */
export async function getGroupesLettrage(
  compte?: string
): Promise<GroupeLettrage[]> {
  let query = supabase
    .from("vue_lignes_a_lettrer")
    .select("*")
    .not("lettre", "is", null);

  if (compte) {
    query = query.eq("numero_compte", compte);
  }

  const { data, error } = await query.order("lettre").order("date_piece");

  if (error) {
    console.error("[Lettrage] Erreur groupes:", error);
    return [];
  }

  // Regrouper par lettre
  const groupes = new Map<string, GroupeLettrage>();

  for (const row of data || []) {
    const key = `${row.numero_compte}-${row.lettre}`;
    
    if (!groupes.has(key)) {
      groupes.set(key, {
        lettre: row.lettre,
        compte: row.numero_compte,
        tiers_code: row.tiers_code,
        tiers_nom: row.tiers_nom,
        lignes: [],
        total_debit: 0,
        total_credit: 0,
        ecart: 0,
        date_lettrage: row.date_lettrage,
      });
    }

    const groupe = groupes.get(key)!;
    groupe.lignes.push({
      id: row.id,
      ecriture_id: row.ecriture_id,
      numero_piece: row.numero_piece,
      date_piece: row.date_piece,
      journal_code: row.journal_code,
      numero_compte: row.numero_compte,
      libelle_ligne: row.libelle_ligne,
      tiers_code: row.tiers_code,
      tiers_nom: row.tiers_nom,
      debit: parseFloat(row.debit) || 0,
      credit: parseFloat(row.credit) || 0,
      montant: parseFloat(row.montant) || 0,
      lettre: row.lettre,
      date_lettrage: row.date_lettrage,
      solde_non_lettre: 0,
    });

    groupe.total_debit += parseFloat(row.debit) || 0;
    groupe.total_credit += parseFloat(row.credit) || 0;
  }

  // Calculer les écarts
  for (const groupe of groupes.values()) {
    groupe.ecart = groupe.total_debit - groupe.total_credit;
  }

  return Array.from(groupes.values());
}

/**
 * Propose des lettrages automatiques basés sur les montants
 */
export async function proposerLettrages(
  compte: string,
  tiersCode?: string
): Promise<PropositionLettrage[]> {
  // Récupérer les lignes non lettrées
  const lignes = await getLignesALettrer({
    compte_debut: compte,
    compte_fin: compte,
    tiers_code: tiersCode,
    statut: "non_lettre",
  });

  if (lignes.length < 2) {
    return [];
  }

  const propositions: PropositionLettrage[] = [];

  // Séparer débits et crédits
  const debits = lignes.filter((l) => l.debit > 0);
  const credits = lignes.filter((l) => l.credit > 0);

  // Rechercher des correspondances exactes
  for (const debit of debits) {
    for (const credit of credits) {
      const montantDebit = debit.debit;
      const montantCredit = credit.credit;
      const ecart = Math.abs(montantDebit - montantCredit);

      // Correspondance exacte ou proche (< 0.01)
      if (ecart < 0.01) {
        propositions.push({
          compte,
          tiers_code: tiersCode,
          lignes_debit: [debit],
          lignes_credit: [credit],
          montant_rapprochable: montantDebit,
          ecart: 0,
          confiance: 100,
          raison: "Montants identiques",
        });
      }
    }
  }

  // Rechercher des groupements (plusieurs crédits pour un débit)
  for (const debit of debits) {
    const montantDebit = debit.debit;
    
    // Chercher une combinaison de crédits qui égale le débit
    for (let i = 0; i < credits.length; i++) {
      for (let j = i + 1; j < credits.length; j++) {
        const sommeCredits = credits[i].credit + credits[j].credit;
        const ecart = Math.abs(montantDebit - sommeCredits);

        if (ecart < 0.01) {
          propositions.push({
            compte,
            tiers_code: tiersCode,
            lignes_debit: [debit],
            lignes_credit: [credits[i], credits[j]],
            montant_rapprochable: montantDebit,
            ecart: 0,
            confiance: 90,
            raison: "Somme de crédits = débit",
          });
        }
      }
    }
  }

  // Rechercher par référence commune (numéro de facture)
  for (const debit of debits) {
    for (const credit of credits) {
      // Chercher des références communes dans les libellés
      const refDebit = extractReference(debit.libelle_ligne);
      const refCredit = extractReference(credit.libelle_ligne);

      if (refDebit && refCredit && refDebit === refCredit) {
        const ecart = Math.abs(debit.debit - credit.credit);
        
        // Même si montants différents, proposer avec écart
        if (ecart > 0.01 && ecart < debit.debit * 0.1) { // Écart < 10%
          propositions.push({
            compte,
            tiers_code: tiersCode,
            lignes_debit: [debit],
            lignes_credit: [credit],
            montant_rapprochable: Math.min(debit.debit, credit.credit),
            ecart,
            confiance: 70,
            raison: `Référence commune: ${refDebit}`,
          });
        }
      }
    }
  }

  // Trier par confiance décroissante
  return propositions.sort((a, b) => b.confiance - a.confiance);
}

/**
 * Récupère l'historique des lettrages
 */
export async function getHistoriqueLettrage(
  compte?: string,
  limit: number = 50
): Promise<LettrageHistory[]> {
  let query = supabase.from("lettrage_history").select("*");

  if (compte) {
    query = query.eq("compte", compte);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[Lettrage] Erreur historique:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    lettre: row.lettre,
    action: row.action,
    lignes_ids: row.lignes_ids,
    compte: row.compte,
    montant: parseFloat(row.montant) || 0,
    created_at: row.created_at,
    created_by: row.created_by,
    commentaire: row.commentaire,
  }));
}

/**
 * Statistiques de lettrage pour un compte
 */
export async function getStatistiquesLettrage(compte: string): Promise<{
  nb_lignes_total: number;
  nb_lignes_lettrees: number;
  nb_lignes_non_lettrees: number;
  montant_lettre: number;
  montant_non_lettre: number;
  taux_lettrage: number;
}> {
  const lignes = await getLignesALettrer({
    compte_debut: compte,
    compte_fin: compte,
  });

  const lettrees = lignes.filter((l) => l.lettre);
  const nonLettrees = lignes.filter((l) => !l.lettre);

  const montantLettre = lettrees.reduce(
    (sum, l) => sum + Math.abs(l.debit - l.credit),
    0
  );
  const montantNonLettre = nonLettrees.reduce(
    (sum, l) => sum + Math.abs(l.debit - l.credit),
    0
  );
  const montantTotal = montantLettre + montantNonLettre;

  return {
    nb_lignes_total: lignes.length,
    nb_lignes_lettrees: lettrees.length,
    nb_lignes_non_lettrees: nonLettrees.length,
    montant_lettre: montantLettre,
    montant_non_lettre: montantNonLettre,
    taux_lettrage: montantTotal > 0 ? (montantLettre / montantTotal) * 100 : 0,
  };
}

// ========== Helpers ==========

/**
 * Extrait une référence (numéro de facture) d'un libellé
 */
function extractReference(libelle: string): string | null {
  // Patterns courants de numéros de facture
  const patterns = [
    /FA[C-]?\s*(\d{4,})/i,
    /FACT[URE]*\s*[N°#]*\s*(\d{4,})/i,
    /N°\s*(\d{4,})/i,
    /REF\s*[:#]?\s*(\w{4,})/i,
  ];

  for (const pattern of patterns) {
    const match = libelle.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}
