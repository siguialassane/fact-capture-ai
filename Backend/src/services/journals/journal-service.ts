/**
 * Service de gestion des Journaux Comptables
 * 
 * Responsabilités :
 * - Numérotation séquentielle des pièces par journal
 * - Validation du type de facture → journal
 * - Résumés et statistiques par journal
 */

import { supabase } from "../../lib/supabase";
import {
  type JournalCode,
  type JournalConfig,
  type JournalSummary,
  type JournalSequence,
  JOURNAUX_CONFIG,
  getJournalConfig,
  getJournalFromFactureType,
} from "./types";

export * from "./types";

/**
 * Récupère tous les journaux actifs
 */
export async function getJournaux(): Promise<JournalConfig[]> {
  const { data, error } = await supabase
    .from("journaux")
    .select("*")
    .eq("actif", true)
    .order("code");

  if (error) {
    console.error("[Journaux] Erreur récupération:", error);
    return JOURNAUX_CONFIG; // Fallback sur config statique
  }

  return data.map((j) => ({
    code: j.code as JournalCode,
    libelle: j.libelle,
    description: j.description || "",
    type_operation: j.type_operation,
    compte_contrepartie: j.compte_contrepartie,
    prefixe_piece: j.prefixe_piece,
  }));
}

/**
 * Obtient le prochain numéro de pièce pour un journal
 * Format: AC-2025-12-00001
 */
export async function getNextPieceNumber(
  journalCode: JournalCode,
  datePiece: Date = new Date()
): Promise<string> {
  const { data, error } = await supabase.rpc("get_next_piece_number", {
    p_journal_code: journalCode,
    p_date_piece: datePiece.toISOString().split("T")[0],
  });

  if (error) {
    console.error("[Journaux] Erreur numérotation:", error);
    // Fallback : générer un numéro basique
    const year = datePiece.getFullYear();
    const month = String(datePiece.getMonth() + 1).padStart(2, "0");
    const random = String(Math.floor(Math.random() * 99999)).padStart(5, "0");
    return `${journalCode}-${year}-${month}-${random}`;
  }

  return data;
}

/**
 * Détermine le journal approprié pour une facture
 * Basé sur le type détecté par l'IA ou explicitement fourni
 */
export function determineJournal(
  typeFacture?: string,
  typeOperation?: string
): { code: JournalCode; config: JournalConfig } {
  // Priorité au type de facture explicite
  const type = typeFacture || typeOperation || "od";
  const journalCode = getJournalFromFactureType(type);
  const config = getJournalConfig(journalCode) || JOURNAUX_CONFIG[4]; // OD par défaut

  return { code: journalCode, config };
}

/**
 * Valide qu'une écriture utilise le bon journal
 */
export function validateJournalForEntry(
  journalCode: JournalCode,
  typeOperation: string,
  lignes: Array<{ numero_compte: string; debit: number; credit: number }>
): { valid: boolean; suggestion?: JournalCode; raison?: string } {
  // Vérifier la cohérence type opération / journal
  const expectedJournal = getJournalFromFactureType(typeOperation);
  
  if (journalCode !== expectedJournal && journalCode !== "OD") {
    return {
      valid: false,
      suggestion: expectedJournal,
      raison: `Une opération de type "${typeOperation}" devrait utiliser le journal ${expectedJournal}, pas ${journalCode}`,
    };
  }

  // Vérifier la présence de comptes cohérents
  const comptes = lignes.map((l) => l.numero_compte);
  
  // Journal AC devrait avoir des comptes 401 (fournisseurs)
  if (journalCode === "AC") {
    const hasFournisseur = comptes.some((c) => c.startsWith("401"));
    if (!hasFournisseur) {
      return {
        valid: false,
        raison: "Le journal des achats (AC) devrait contenir un compte fournisseur (401x)",
      };
    }
  }

  // Journal VE devrait avoir des comptes 411 (clients)
  if (journalCode === "VE") {
    const hasClient = comptes.some((c) => c.startsWith("411"));
    if (!hasClient) {
      return {
        valid: false,
        raison: "Le journal des ventes (VE) devrait contenir un compte client (411x)",
      };
    }
  }

  // Journal BQ devrait avoir des comptes 512 (banque)
  if (journalCode === "BQ") {
    const hasBanque = comptes.some((c) => c.startsWith("512"));
    if (!hasBanque) {
      return {
        valid: false,
        raison: "Le journal de banque (BQ) devrait contenir un compte banque (512x)",
      };
    }
  }

  return { valid: true };
}

/**
 * Récupère le résumé des écritures par journal
 */
export async function getJournalSummary(
  periode?: string // Format: "2025-12" ou null pour tout
): Promise<JournalSummary[]> {
  let query = supabase.from("vue_journal_summary").select("*");

  if (periode) {
    query = query.eq("periode", periode);
  }

  const { data, error } = await query.order("periode", { ascending: false });

  if (error) {
    console.error("[Journaux] Erreur résumé:", error);
    return [];
  }

  return data.map((row) => ({
    journal_code: row.journal_code as JournalCode,
    journal_libelle: row.journal_libelle,
    periode: row.periode,
    nb_ecritures: row.nb_ecritures,
    total_debit: parseFloat(row.total_debit) || 0,
    total_credit: parseFloat(row.total_credit) || 0,
    premiere_piece: row.premiere_piece,
    derniere_piece: row.derniere_piece,
  }));
}

/**
 * Récupère les écritures d'un journal pour une période
 */
export async function getJournalEntries(
  journalCode: JournalCode,
  options?: {
    dateDebut?: string;
    dateFin?: string;
    statut?: "brouillon" | "validee" | "cloturee";
    limit?: number;
  }
): Promise<any[]> {
  let query = supabase
    .from("journal_entries")
    .select(`
      *,
      lignes:journal_entry_lines(*)
    `)
    .eq("journal_code", journalCode);

  if (options?.dateDebut) {
    query = query.gte("date_piece", options.dateDebut);
  }
  if (options?.dateFin) {
    query = query.lte("date_piece", options.dateFin);
  }
  if (options?.statut) {
    query = query.eq("statut", options.statut);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query.order("date_piece", { ascending: false });

  if (error) {
    console.error("[Journaux] Erreur récupération écritures:", error);
    return [];
  }

  return data || [];
}

/**
 * Récupère les séquences de numérotation
 */
export async function getSequences(
  exercice?: string
): Promise<JournalSequence[]> {
  let query = supabase.from("journal_sequences").select("*");

  if (exercice) {
    query = query.eq("exercice", exercice);
  }

  const { data, error } = await query.order("journal_code");

  if (error) {
    console.error("[Journaux] Erreur séquences:", error);
    return [];
  }

  return data || [];
}

/**
 * Statistiques globales des journaux
 */
export async function getJournalStats(): Promise<{
  total_ecritures: number;
  total_debit: number;
  total_credit: number;
  par_journal: Record<JournalCode, { nb: number; debit: number; credit: number }>;
}> {
  const summaries = await getJournalSummary();

  const stats = {
    total_ecritures: 0,
    total_debit: 0,
    total_credit: 0,
    par_journal: {} as Record<JournalCode, { nb: number; debit: number; credit: number }>,
  };

  for (const s of summaries) {
    stats.total_ecritures += s.nb_ecritures;
    stats.total_debit += s.total_debit;
    stats.total_credit += s.total_credit;

    if (!stats.par_journal[s.journal_code]) {
      stats.par_journal[s.journal_code] = { nb: 0, debit: 0, credit: 0 };
    }
    stats.par_journal[s.journal_code].nb += s.nb_ecritures;
    stats.par_journal[s.journal_code].debit += s.total_debit;
    stats.par_journal[s.journal_code].credit += s.total_credit;
  }

  return stats;
}

/**
 * Mapping des comptes de contrepartie par journal SYSCOHADA
 */
export const JOURNAL_CONTREPARTIE_MAPPING: Record<JournalCode, { 
  compte: string; 
  libelle: string;
  comptes_associes: string[];
}> = {
  AC: { 
    compte: "4011", 
    libelle: "Fournisseurs",
    comptes_associes: ["401", "4011", "4017"] 
  },
  VE: { 
    compte: "4111", 
    libelle: "Clients",
    comptes_associes: ["411", "4111", "4117"] 
  },
  BQ: { 
    compte: "5211", 
    libelle: "Banque",
    comptes_associes: ["512", "5211", "521"] 
  },
  CA: { 
    compte: "571", 
    libelle: "Caisse",
    comptes_associes: ["57", "571", "5711"] 
  },
  OD: { 
    compte: "", 
    libelle: "Opérations diverses",
    comptes_associes: [] 
  },
};

/**
 * Corrige le journal d'une écriture existante
 * Met à jour automatiquement les comptes de contrepartie selon le nouveau journal
 */
export async function correctEntryJournal(
  entryId: string,
  newJournalCode: JournalCode,
  reason?: string
): Promise<{
  success: boolean;
  entry?: any;
  changes?: {
    old_journal: JournalCode;
    new_journal: JournalCode;
    updated_accounts: Array<{
      line_id: string;
      old_account: string;
      new_account: string;
      reason: string;
    }>;
  };
  error?: string;
}> {
  try {
    // 1. Récupérer l'écriture existante avec ses lignes
    const { data: existingEntry, error: fetchError } = await supabase
      .from("journal_entries")
      .select(`
        *,
        lignes:journal_entry_lines(*)
      `)
      .eq("id", entryId)
      .single();

    if (fetchError || !existingEntry) {
      return { 
        success: false, 
        error: `Écriture non trouvée: ${entryId}` 
      };
    }

    const oldJournalCode = existingEntry.journal_code as JournalCode;
    
    // Si même journal, rien à faire
    if (oldJournalCode === newJournalCode) {
      return { 
        success: true, 
        entry: existingEntry,
        changes: {
          old_journal: oldJournalCode,
          new_journal: newJournalCode,
          updated_accounts: []
        }
      };
    }

    const oldContrepartie = JOURNAL_CONTREPARTIE_MAPPING[oldJournalCode];
    const newContrepartie = JOURNAL_CONTREPARTIE_MAPPING[newJournalCode];
    const updatedAccounts: Array<{
      line_id: string;
      old_account: string;
      new_account: string;
      reason: string;
    }> = [];

    // 2. Générer un nouveau numéro de pièce pour le nouveau journal
    const newNumeroPiece = await getNextPieceNumber(
      newJournalCode, 
      new Date(existingEntry.date_piece)
    );

    // 3. Mettre à jour les lignes de contrepartie
    const lignes = existingEntry.lignes || [];
    
    for (const ligne of lignes) {
      const compte = ligne.numero_compte;
      
      // Vérifier si c'est un compte de contrepartie de l'ancien journal
      const isOldContrepartie = oldContrepartie.comptes_associes.some(
        prefix => compte.startsWith(prefix.substring(0, 3))
      );

      if (isOldContrepartie && newContrepartie.compte) {
        // Calculer le nouveau compte
        // Garder le même niveau de détail (4011 → 4111, 571 → 5211, etc.)
        const newCompte = newContrepartie.compte;
        
        // Mettre à jour la ligne
        const { error: updateLineError } = await supabase
          .from("journal_entry_lines")
          .update({ 
            numero_compte: newCompte,
            libelle_compte: newContrepartie.libelle
          })
          .eq("id", ligne.id);

        if (updateLineError) {
          console.error("[Journaux] Erreur MAJ ligne:", updateLineError);
        } else {
          updatedAccounts.push({
            line_id: ligne.id,
            old_account: compte,
            new_account: newCompte,
            reason: `Contrepartie ${oldJournalCode} → ${newJournalCode}`
          });
        }
      }
    }

    // 4. Mettre à jour l'écriture principale
    const { data: updatedEntry, error: updateError } = await supabase
      .from("journal_entries")
      .update({
        journal_code: newJournalCode,
        numero_piece: newNumeroPiece,
        updated_at: new Date().toISOString()
      })
      .eq("id", entryId)
      .select()
      .single();

    if (updateError) {
      return { 
        success: false, 
        error: `Erreur mise à jour écriture: ${updateError.message}` 
      };
    }

    // 5. Logger la correction pour audit
    console.log(`[Journaux] Correction: ${entryId} déplacé de ${oldJournalCode} vers ${newJournalCode}. Raison: ${reason || "Non spécifiée"}`);

    return {
      success: true,
      entry: updatedEntry,
      changes: {
        old_journal: oldJournalCode,
        new_journal: newJournalCode,
        updated_accounts: updatedAccounts
      }
    };

  } catch (error: any) {
    console.error("[Journaux] Erreur correction:", error);
    return { 
      success: false, 
      error: error.message || "Erreur inconnue" 
    };
  }
}
