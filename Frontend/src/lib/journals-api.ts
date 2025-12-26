/**
 * API Client pour les Journaux Comptables
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

export type JournalCode = "AC" | "VE" | "BQ" | "CA" | "OD";

export interface JournalConfig {
  code: JournalCode;
  libelle: string;
  description: string;
  type_operation: string;
  compte_contrepartie?: string;
  prefixe_piece: string;
}

export interface JournalSummary {
  journal_code: JournalCode;
  journal_libelle: string;
  periode: string;
  nb_ecritures: number;
  total_debit: number;
  total_credit: number;
  premiere_piece: string;
  derniere_piece: string;
}

export interface JournalEntry {
  id: number;
  numero_piece: string;
  date_piece: string;
  journal_code: JournalCode;
  libelle_general: string;
  tiers_code?: string;
  tiers_nom?: string;
  total_debit: number;
  total_credit: number;
  equilibre: boolean;
  statut: "brouillon" | "validee" | "cloturee";
  lignes: Array<{
    numero_compte: string;
    libelle_compte?: string;
    libelle_ligne: string;
    debit: number;
    credit: number;
  }>;
}

/**
 * Récupère la liste des journaux
 */
export async function getJournaux(): Promise<JournalConfig[]> {
  const response = await fetch(`${BACKEND_URL}/api/journals`);
  const result = await response.json();
  return result.data || [];
}

/**
 * Récupère les statistiques des journaux
 */
export async function getJournalStats(): Promise<{
  total_ecritures: number;
  total_debit: number;
  total_credit: number;
  par_journal: Record<JournalCode, { nb: number; debit: number; credit: number }>;
}> {
  const response = await fetch(`${BACKEND_URL}/api/journals/stats`);
  const result = await response.json();
  return result.data;
}

/**
 * Récupère le résumé par journal
 */
export async function getJournalSummary(periode?: string): Promise<JournalSummary[]> {
  // Si période = "all" ou undefined, ne pas filtrer
  const url = periode && periode !== "all"
    ? `${BACKEND_URL}/api/journals/summary?periode=${periode}`
    : `${BACKEND_URL}/api/journals/summary`;
  const response = await fetch(url);
  const result = await response.json();
  return result.data || [];
}

/**
 * Récupère les écritures d'un journal
 */
export async function getJournalEntries(
  journalCode: JournalCode,
  options?: {
    dateDebut?: string;
    dateFin?: string;
    statut?: string;
    limit?: number;
  }
): Promise<{ journal_code: JournalCode; ecritures: JournalEntry[]; count: number }> {
  const params = new URLSearchParams();
  if (options?.dateDebut) params.set("date_debut", options.dateDebut);
  if (options?.dateFin) params.set("date_fin", options.dateFin);
  if (options?.statut) params.set("statut", options.statut);
  if (options?.limit) params.set("limit", options.limit.toString());

  const url = `${BACKEND_URL}/api/journals/${journalCode}?${params}`;
  const response = await fetch(url);
  const result = await response.json();
  return result.data;
}

/**
 * Génère le prochain numéro de pièce
 */
export async function getNextPieceNumber(
  journalCode: JournalCode,
  datePiece?: string
): Promise<{ numero_piece: string; journal_code: JournalCode; date_piece: string }> {
  const response = await fetch(`${BACKEND_URL}/api/journals/next-piece`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      journal_code: journalCode,
      date_piece: datePiece,
    }),
  });
  const result = await response.json();
  return result.data;
}

/**
 * Corrige le journal d'une écriture (déplace vers un autre journal)
 * Met à jour automatiquement les comptes de contrepartie
 */
export async function correctEntryJournal(
  entryId: string,
  newJournalCode: JournalCode,
  reason?: string
): Promise<{
  success: boolean;
  entry?: JournalEntry;
  changes?: {
    old_journal: JournalCode;
    new_journal: JournalCode;
    updated_accounts: Array<{
      old_account: string;
      new_account: string;
      reason: string;
    }>;
  };
  error?: string;
}> {
  const response = await fetch(`${BACKEND_URL}/api/journals/correct-journal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entry_id: entryId,
      new_journal_code: newJournalCode,
      reason: reason || "Correction manuelle du journal",
    }),
  });
  const result = await response.json();
  return result;
}

/**
 * Infos supplémentaires pour la régénération
 */
export interface RegenerateAdditionalInfo {
  new_tiers_name?: string;
  new_tiers_type: "client" | "fournisseur";
  payment_mode: "especes" | "carte_bancaire" | "virement" | "cheque" | "credit";
  reason: string;
}

/**
 * Ligne d'écriture régénérée
 */
export interface RegeneratedLine {
  numero_compte: string;
  libelle_compte: string;
  libelle_ligne: string;
  debit: number;
  credit: number;
}

/**
 * Écriture régénérée par l'IA
 */
export interface RegeneratedEntry {
  date_piece: string;
  numero_piece: string;
  journal_code: JournalCode;
  journal_libelle: string;
  libelle_general: string;
  tiers_code?: string;
  tiers_nom?: string;
  lignes: RegeneratedLine[];
  total_debit: number;
  total_credit: number;
  equilibre: boolean;
  commentaires?: string;
}

/**
 * Résultat de la régénération
 */
export interface RegenerateResult {
  proposed_entry: RegeneratedEntry;
  reasoning: string;
  changes_summary: {
    old_journal: JournalCode;
    new_journal: JournalCode;
    old_tiers?: string;
    new_tiers?: string;
    accounts_changed: number;
  };
}

/**
 * Régénère une écriture comptable pour un nouveau journal avec DeepSeek AI
 */
export async function regenerateEntryWithAI(
  entryId: string,
  targetJournal: JournalCode,
  additionalInfo: RegenerateAdditionalInfo
): Promise<{
  success: boolean;
  data?: RegenerateResult;
  error?: string;
}> {
  const response = await fetch(`${BACKEND_URL}/api/journals/regenerate-entry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entry_id: entryId,
      target_journal: targetJournal,
      additional_info: additionalInfo,
    }),
  });

  const result = await response.json();
  return result;
}

/**
 * Sauvegarde l'écriture régénérée et supprime l'ancienne
 */
export async function saveRegeneratedEntry(
  oldEntryId: string,
  newEntry: RegeneratedEntry
): Promise<{
  success: boolean;
  data?: { new_entry_id: string; message: string };
  error?: string;
}> {
  const response = await fetch(`${BACKEND_URL}/api/journals/save-regenerated`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      old_entry_id: oldEntryId,
      new_entry: newEntry,
    }),
  });

  const result = await response.json();
  return result;
}

/**
 * Mapping des contreparties par journal
 */

export const JOURNAL_CONTREPARTIE: Record<JournalCode, { compte: string; libelle: string }> = {
  AC: { compte: "4011", libelle: "Fournisseurs" },
  VE: { compte: "4111", libelle: "Clients" },
  BQ: { compte: "5211", libelle: "Banque" },
  CA: { compte: "571", libelle: "Caisse" },
  OD: { compte: "", libelle: "Divers" },
};
