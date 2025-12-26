/**
 * Types pour la gestion des journaux comptables
 * SYSCOHADA - Journaux AC, VE, BQ, CA, OD
 */

/** Codes des journaux standards SYSCOHADA */
export type JournalCode = "AC" | "VE" | "BQ" | "CA" | "OD";

/** Types d'opérations comptables */
export type OperationType = "achat" | "vente" | "banque" | "caisse" | "od";

/** Configuration d'un journal */
export interface JournalConfig {
  code: JournalCode;
  libelle: string;
  description: string;
  type_operation: OperationType;
  compte_contrepartie?: string; // Compte par défaut (ex: 512 pour BQ)
  prefixe_piece: string; // Préfixe pour numérotation (AC-, VE-, etc.)
}

/** Séquence de numérotation par journal */
export interface JournalSequence {
  id: number;
  journal_code: JournalCode;
  exercice: string; // Format: "2025"
  mois: number; // 1-12
  dernier_numero: number;
  created_at: string;
  updated_at: string;
}

/** Résumé d'un journal pour une période */
export interface JournalSummary {
  journal_code: JournalCode;
  journal_libelle: string;
  periode: string; // Format: "2025-12" ou "all" pour toutes périodes
  nb_ecritures: number;
  total_debit: number;
  total_credit: number;
  premiere_piece?: string | null;
  derniere_piece?: string | null;
}

/** Écriture dans un journal */
export interface JournalEntryHeader {
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
  created_at: string;
}

/** Mapping type facture → journal */
export const FACTURE_TO_JOURNAL: Record<string, JournalCode> = {
  achat: "AC",
  vente: "VE",
  avoir_achat: "AC",
  avoir_vente: "VE",
  banque: "BQ",
  caisse: "CA",
  od: "OD",
};

/** Configuration des journaux standards */
export const JOURNAUX_CONFIG: JournalConfig[] = [
  {
    code: "AC",
    libelle: "Journal des Achats",
    description: "Enregistrement des factures fournisseurs",
    type_operation: "achat",
    compte_contrepartie: "401", // Fournisseurs
    prefixe_piece: "AC",
  },
  {
    code: "VE",
    libelle: "Journal des Ventes",
    description: "Enregistrement des factures clients",
    type_operation: "vente",
    compte_contrepartie: "411", // Clients
    prefixe_piece: "VE",
  },
  {
    code: "BQ",
    libelle: "Journal de Banque",
    description: "Opérations bancaires (virements, prélèvements)",
    type_operation: "banque",
    compte_contrepartie: "512", // Banque
    prefixe_piece: "BQ",
  },
  {
    code: "CA",
    libelle: "Journal de Caisse",
    description: "Opérations en espèces",
    type_operation: "caisse",
    compte_contrepartie: "571", // Caisse
    prefixe_piece: "CA",
  },
  {
    code: "OD",
    libelle: "Journal des Opérations Diverses",
    description: "Écritures de régularisation, amortissements, etc.",
    type_operation: "od",
    prefixe_piece: "OD",
  },
];

/** Obtenir la config d'un journal */
export function getJournalConfig(code: JournalCode): JournalConfig | undefined {
  return JOURNAUX_CONFIG.find((j) => j.code === code);
}

/** Déterminer le journal depuis le type de facture */
export function getJournalFromFactureType(
  typeFacture: string
): JournalCode {
  const normalized = typeFacture.toLowerCase().trim();
  return FACTURE_TO_JOURNAL[normalized] || "OD";
}
