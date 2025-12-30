/**
 * Business Configuration
 *
 * Configuration métier centralisée pour EXIAS
 * Rassemble toutes les valeurs hardcodées qui étaient dispersées dans le code
 */

/**
 * Configuration de l'entreprise
 */
export const COMPANY = {
  name: "EXIAS",
  fullName: "EXIAS SARL",
  legalForm: "SARL",
  activity: "Vente de matériel informatique et prestations de services",
  country: "Côte d'Ivoire",
  city: "Abidjan",
  currency: "XOF", // Franc CFA
} as const;

/**
 * Configuration des taux de TVA (SYSCOHADA)
 */
export const TAX_RATES = {
  normal: 18, // Taux normal en Côte d'Ivoire
  reduced: 9, // Taux réduit
  exempt: 0, // Exonéré
} as const;

/**
 * Configuration des journaux comptables (SYSCOHADA)
 */
export const JOURNALS = {
  AC: { code: "AC", label: "Journal des Achats", type: "achat" },
  VE: { code: "VE", label: "Journal des Ventes", type: "vente" },
  BQ: { code: "BQ", label: "Journal de Banque", type: "banque" },
  CA: { code: "CA", label: "Journal de Caisse", type: "caisse" },
  OD: { code: "OD", label: "Journal des Opérations Diverses", type: "od" },
} as const;

export type JournalCode = keyof typeof JOURNALS;

/**
 * Configuration des comptes par défaut
 */
export const DEFAULT_ACCOUNTS = {
  // Tiers
  clients: "411", // Clients
  fournisseurs: "401", // Fournisseurs

  // Trésorerie
  caisse: "571", // Caisse
  banque: "521", // Banque (compte principal)

  // TVA
  tvaCollectee: "4431", // TVA facturée
  tvaDeductible: "4452", // TVA récupérable sur achats
  tvaDeductibleImmo: "4451", // TVA récupérable sur immobilisations

  // Résultat
  resultatExercice: "12", // Résultat de l'exercice
} as const;

/**
 * Configuration des classes de comptes SYSCOHADA
 */
export const ACCOUNT_CLASSES = {
  1: { label: "Comptes de ressources durables", type: "passif" },
  2: { label: "Comptes d'actif immobilisé", type: "actif" },
  3: { label: "Comptes de stocks", type: "actif" },
  4: { label: "Comptes de tiers", type: "mixte" },
  5: { label: "Comptes de trésorerie", type: "actif" },
  6: { label: "Comptes de charges", type: "charge" },
  7: { label: "Comptes de produits", type: "produit" },
  8: { label: "Comptes des autres charges et produits", type: "mixte" },
  9: { label: "Comptes analytiques", type: "analytique" },
} as const;

/**
 * Configuration des taux de change (référence FCFA)
 */
export const EXCHANGE_RATES = {
  EUR: 655.957, // 1 EUR = 655.957 XOF
  USD: 600, // Approximatif
  GBP: 750, // Approximatif
} as const;

/**
 * Configuration de l'exercice fiscal
 */
export const FISCAL_YEAR = {
  startMonth: 1, // Janvier
  endMonth: 12, // Décembre
  format: "YYYY", // Format du code exercice
} as const;

/**
 * Helper pour obtenir l'exercice courant
 */
export function getCurrentFiscalYear(): string {
  return new Date().getFullYear().toString();
}

/**
 * Helper pour formater un montant en XOF
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("fr-CI", {
    style: "currency",
    currency: COMPANY.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Helper pour déterminer le sens normal d'un compte
 */
export function getAccountNormalSide(accountNumber: string): "debit" | "credit" {
  const classe = parseInt(accountNumber.charAt(0), 10);

  // Classes 2, 3, 5, 6 → sens débiteur (actif, stocks, trésorerie, charges)
  if ([2, 3, 5, 6].includes(classe)) {
    return "debit";
  }

  // Classes 1, 7 → sens créditeur (passif, produits)
  if ([1, 7].includes(classe)) {
    return "credit";
  }

  // Classe 4 → dépend du compte
  if (classe === 4) {
    // 40x Fournisseurs → créditeur
    // 41x Clients → débiteur
    const deuxPremiers = parseInt(accountNumber.substring(0, 2), 10);
    return deuxPremiers >= 41 ? "debit" : "credit";
  }

  // Par défaut
  return "debit";
}
