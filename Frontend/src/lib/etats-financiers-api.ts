/**
 * API pour les États Financiers SYSCOHADA
 * 
 * Récupère les données de bilan, compte de résultat et indicateurs financiers
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Types
export interface LigneBilan {
  compte: string;
  libelle: string;
  montant: number;
}

export interface SectionBilan {
  total: number;
  lignes: LigneBilan[];
}

export interface Bilan {
  exercice: string;
  actif_immobilise: SectionBilan;
  actif_circulant: SectionBilan;
  tresorerie_actif: number;
  total_actif: number;
  capitaux_propres: SectionBilan;
  dettes: SectionBilan;
  tresorerie_passif: number;
  total_passif: number;
}

export interface LigneResultat {
  compte: string;
  libelle: string;
  montant: number;
}

export interface CompteResultat {
  exercice: string;
  charges: LigneResultat[];
  produits: LigneResultat[];
  total_charges: number;
  total_produits: number;
  resultat_net: number;
}

export interface Indicateurs {
  exercice: string;
  // Rentabilité
  marge_brute: number;
  marge_nette: number;
  roe: number; // Return on Equity
  // Liquidité
  ratio_liquidite: number;
  bfr: number; // Besoin en Fonds de Roulement
  tresorerie_nette: number;
  // Structure
  taux_endettement: number;
  autonomie_financiere: number;
  // Rotation
  delai_client: number;
  delai_fournisseur: number;
  rotation_stocks: number;
}

/**
 * Récupère le bilan pour un exercice donné
 */
export async function getBilan(exercice: string): Promise<Bilan | null> {
  try {
    const response = await fetch(`${API_BASE}/etats-financiers/bilan?exercice=${exercice}`);
    if (!response.ok) {
      console.error("Erreur API bilan:", response.status);
      return getMockBilan(exercice);
    }
    return await response.json();
  } catch (error) {
    console.error("Erreur récupération bilan:", error);
    return getMockBilan(exercice);
  }
}

/**
 * Récupère le compte de résultat pour un exercice donné
 */
export async function getCompteResultat(exercice: string): Promise<CompteResultat | null> {
  try {
    const response = await fetch(`${API_BASE}/etats-financiers/resultat?exercice=${exercice}`);
    if (!response.ok) {
      console.error("Erreur API résultat:", response.status);
      return getMockCompteResultat(exercice);
    }
    return await response.json();
  } catch (error) {
    console.error("Erreur récupération compte de résultat:", error);
    return getMockCompteResultat(exercice);
  }
}

/**
 * Récupère les indicateurs financiers pour un exercice donné
 */
export async function getIndicateursFinanciers(exercice: string): Promise<Indicateurs | null> {
  try {
    const response = await fetch(`${API_BASE}/etats-financiers/indicateurs?exercice=${exercice}`);
    if (!response.ok) {
      console.error("Erreur API indicateurs:", response.status);
      return getMockIndicateurs(exercice);
    }
    return await response.json();
  } catch (error) {
    console.error("Erreur récupération indicateurs:", error);
    return getMockIndicateurs(exercice);
  }
}

// ============================================================================
// DONNÉES DE DÉMONSTRATION (Mock data)
// Utilisées quand l'API n'est pas disponible ou retourne une erreur
// ============================================================================

function getMockBilan(exercice: string): Bilan {
  return {
    exercice,
    actif_immobilise: {
      total: 0,
      lignes: [
        { compte: "21", libelle: "Immobilisations corporelles", montant: 0 },
        { compte: "22", libelle: "Terrains", montant: 0 },
        { compte: "23", libelle: "Bâtiments", montant: 0 },
        { compte: "24", libelle: "Matériel et outillage", montant: 0 },
      ],
    },
    actif_circulant: {
      total: 0,
      lignes: [
        { compte: "31", libelle: "Stocks de marchandises", montant: 0 },
        { compte: "41", libelle: "Clients", montant: 0 },
        { compte: "42", libelle: "Personnel", montant: 0 },
      ],
    },
    tresorerie_actif: 0,
    total_actif: 0,
    capitaux_propres: {
      total: 0,
      lignes: [
        { compte: "10", libelle: "Capital social", montant: 0 },
        { compte: "11", libelle: "Réserves", montant: 0 },
        { compte: "12", libelle: "Report à nouveau", montant: 0 },
        { compte: "13", libelle: "Résultat de l'exercice", montant: 0 },
      ],
    },
    dettes: {
      total: 0,
      lignes: [
        { compte: "40", libelle: "Fournisseurs", montant: 0 },
        { compte: "43", libelle: "Organismes sociaux", montant: 0 },
        { compte: "44", libelle: "État et collectivités", montant: 0 },
        { compte: "16", libelle: "Emprunts", montant: 0 },
      ],
    },
    tresorerie_passif: 0,
    total_passif: 0,
  };
}

function getMockCompteResultat(exercice: string): CompteResultat {
  return {
    exercice,
    charges: [
      { compte: "60", libelle: "Achats", montant: 0 },
      { compte: "61", libelle: "Transports", montant: 0 },
      { compte: "62", libelle: "Services extérieurs", montant: 0 },
      { compte: "63", libelle: "Autres services extérieurs", montant: 0 },
      { compte: "64", libelle: "Impôts et taxes", montant: 0 },
      { compte: "65", libelle: "Autres charges", montant: 0 },
      { compte: "66", libelle: "Charges de personnel", montant: 0 },
      { compte: "67", libelle: "Charges financières", montant: 0 },
      { compte: "68", libelle: "Dotations aux amortissements", montant: 0 },
    ],
    produits: [
      { compte: "70", libelle: "Ventes de marchandises", montant: 0 },
      { compte: "71", libelle: "Production vendue", montant: 0 },
      { compte: "72", libelle: "Production stockée", montant: 0 },
      { compte: "73", libelle: "Production immobilisée", montant: 0 },
      { compte: "74", libelle: "Subventions d'exploitation", montant: 0 },
      { compte: "75", libelle: "Autres produits", montant: 0 },
      { compte: "76", libelle: "Produits financiers", montant: 0 },
      { compte: "77", libelle: "Produits exceptionnels", montant: 0 },
    ],
    total_charges: 0,
    total_produits: 0,
    resultat_net: 0,
  };
}

function getMockIndicateurs(exercice: string): Indicateurs {
  return {
    exercice,
    marge_brute: 0,
    marge_nette: 0,
    roe: 0,
    ratio_liquidite: 0,
    bfr: 0,
    tresorerie_nette: 0,
    taux_endettement: 0,
    autonomie_financiere: 0,
    delai_client: 0,
    delai_fournisseur: 0,
    rotation_stocks: 0,
  };
}
