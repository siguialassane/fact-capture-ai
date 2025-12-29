/**
 * Service États Financiers
 * 
 * Responsabilités :
 * - Génération du Bilan SYSCOHADA
 * - Génération du Compte de Résultat
 * - Calcul des indicateurs financiers
 */

import { supabase } from "../../lib/supabase";

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
  marge_brute: number;
  marge_nette: number;
  roe: number;
  ratio_liquidite: number;
  bfr: number;
  tresorerie_nette: number;
  taux_endettement: number;
  autonomie_financiere: number;
  delai_client: number;
  delai_fournisseur: number;
  rotation_stocks: number;
}

// Classes SYSCOHADA - CORRIGÉ
// ATTENTION: Les comptes 44 ont une classification mixte:
// - 4452/4456 (TVA récupérable) → ACTIF (créance sur État)
// - 443x (TVA collectée) → PASSIF (dette envers État)
// - 40x (Fournisseurs) → PASSIF
// - 41x (Clients) → ACTIF
const CLASSES = {
  IMMOBILISATIONS: ["2"], // Classe 2
  STOCKS: ["3"], // Classe 3
  // Tiers ACTIF: Clients + TVA récupérable
  TIERS_ACTIF: ["41", "4452", "4454", "4456"], // Clients, TVA récupérable/déductible
  TRESORERIE_ACTIF: ["5"], // Classe 5 actif (solde débiteur)
  CAPITAUX: ["1"], // Classe 1
  // Tiers PASSIF: Fournisseurs + Organismes sociaux + TVA collectée + Autres État
  TIERS_PASSIF: ["40", "42", "43", "443", "4431", "4432", "4434", "4455"], // Fournisseurs, Personnel (créditeur), Organismes, TVA collectée
  TRESORERIE_PASSIF: ["52", "56"], // Banques solde créditeur
  CHARGES: ["6"], // Classe 6
  PRODUITS: ["7"], // Classe 7
};

/**
 * Récupère les soldes par classe de compte pour un exercice
 */
async function getSoldesByClasse(
  exercice: string,
  prefixes: string[]
): Promise<{ compte: string; libelle: string; solde: number }[]> {
  // Récupérer depuis journal_entry_lines
  const dateDebut = `${exercice}-01-01`;
  const dateFin = `${exercice}-12-31`;

  const { data, error } = await supabase
    .from("journal_entry_lines")
    .select(`
      compte_numero,
      debit,
      credit,
      journal_entries!inner(date_piece)
    `)
    .gte("journal_entries.date_piece", dateDebut)
    .lte("journal_entries.date_piece", dateFin);

  if (error) {
    console.error("[États Financiers] Erreur récupération soldes:", error);
    return [];
  }

  if (!data) return [];

  // Filtrer par préfixes et agréger par compte
  const soldesMap = new Map<string, { libelle: string; debit: number; credit: number }>();

  for (const ligne of data) {
    const compte = ligne.compte_numero;
    if (!compte) continue;

    // Vérifier si le compte correspond aux préfixes
    const matchPrefix = prefixes.some((p) => compte.startsWith(p));
    if (!matchPrefix) continue;

    if (!soldesMap.has(compte)) {
      soldesMap.set(compte, {
        libelle: getLibelleCompte(compte),
        debit: 0,
        credit: 0,
      });
    }

    const entry = soldesMap.get(compte)!;
    entry.debit += parseFloat(String(ligne.debit)) || 0;
    entry.credit += parseFloat(String(ligne.credit)) || 0;
  }

  // Convertir en array avec solde
  return Array.from(soldesMap.entries()).map(([compte, data]) => ({
    compte,
    libelle: data.libelle,
    solde: data.debit - data.credit,
  }));
}

/**
 * Retourne le libellé d'un compte SYSCOHADA
 */
function getLibelleCompte(numero: string): string {
  const libelles: Record<string, string> = {
    "10": "Capital social",
    "11": "Réserves",
    "12": "Report à nouveau",
    "13": "Résultat net",
    "16": "Emprunts et dettes",
    "20": "Charges immobilisées",
    "21": "Immobilisations incorporelles",
    "22": "Terrains",
    "23": "Bâtiments",
    "24": "Matériel et outillage",
    "25": "Avances et acomptes sur immobilisations",
    "27": "Autres immobilisations financières",
    "28": "Amortissements",
    "31": "Marchandises",
    "32": "Matières premières",
    "33": "Autres approvisionnements",
    "34": "En-cours de production",
    "35": "Produits fabriqués",
    "37": "Stocks à l'extérieur",
    "39": "Dépréciations des stocks",
    "40": "Fournisseurs",
    "41": "Clients",
    "42": "Personnel",
    "43": "Organismes sociaux",
    "44": "État",
    "45": "Organismes internationaux",
    "46": "Associés et groupe",
    "47": "Débiteurs et créditeurs divers",
    "48": "Créances et dettes HAO",
    "49": "Dépréciations",
    "50": "Titres de placement",
    "51": "Valeurs à encaisser",
    "52": "Banques",
    "53": "Établissements financiers",
    "54": "Instruments de trésorerie",
    "56": "Banques, crédits de trésorerie",
    "57": "Caisse",
    "58": "Régies d'avances et accréditifs",
    "59": "Dépréciations",
    "60": "Achats",
    "61": "Transports",
    "62": "Services extérieurs A",
    "63": "Services extérieurs B",
    "64": "Impôts et taxes",
    "65": "Autres charges",
    "66": "Charges de personnel",
    "67": "Frais financiers",
    "68": "Dotations aux amortissements",
    "69": "Dotations aux provisions",
    "70": "Ventes",
    "71": "Subventions d'exploitation",
    "72": "Production immobilisée",
    "73": "Variations de stocks",
    "75": "Autres produits",
    "77": "Revenus financiers",
    "78": "Transferts de charges",
    "79": "Reprises de provisions",
  };

  // Chercher le libellé le plus proche
  for (let i = numero.length; i >= 2; i--) {
    const prefix = numero.substring(0, i);
    if (libelles[prefix]) {
      return libelles[prefix];
    }
  }

  return `Compte ${numero}`;
}

/**
 * Génère le bilan pour un exercice
 */
export async function getBilan(exercice: string): Promise<Bilan> {
  // Récupérer les soldes par section
  const [
    immobilisations,
    stocks,
    tiersActif,
    tresorerieActif,
    capitaux,
    tiersPassif,
    tresoreriePassif,
  ] = await Promise.all([
    getSoldesByClasse(exercice, CLASSES.IMMOBILISATIONS),
    getSoldesByClasse(exercice, CLASSES.STOCKS),
    getSoldesByClasse(exercice, CLASSES.TIERS_ACTIF),
    getSoldesByClasse(exercice, CLASSES.TRESORERIE_ACTIF),
    getSoldesByClasse(exercice, CLASSES.CAPITAUX),
    getSoldesByClasse(exercice, CLASSES.TIERS_PASSIF),
    getSoldesByClasse(exercice, CLASSES.TRESORERIE_PASSIF),
  ]);

  // =====================================================================
  // IMPORTANT: Calculer le Résultat Net pour l'inclure dans les Capitaux Propres
  // Le Bilan doit toujours être équilibré: ACTIF = PASSIF
  // Le Résultat Net (Produits - Charges) est un composant des Capitaux Propres
  // =====================================================================
  const compteResultat = await getCompteResultat(exercice);
  const resultatNet = compteResultat.resultat_net;

  // Construire l'actif immobilisé
  const actifImmobilise: SectionBilan = {
    lignes: immobilisations.map((c) => ({
      compte: c.compte,
      libelle: c.libelle,
      montant: Math.abs(c.solde),
    })),
    total: immobilisations.reduce((sum, c) => sum + Math.abs(c.solde), 0),
  };

  // Construire l'actif circulant (stocks + tiers actif)
  const actifCirculantData = [...stocks, ...tiersActif];
  const actifCirculant: SectionBilan = {
    lignes: actifCirculantData.map((c) => ({
      compte: c.compte,
      libelle: c.libelle,
      montant: Math.abs(c.solde),
    })),
    total: actifCirculantData.reduce((sum, c) => sum + Math.abs(c.solde), 0),
  };

  // Trésorerie actif (soldes débiteurs classe 5)
  const tresoActif = tresorerieActif
    .filter((c) => c.solde > 0)
    .reduce((sum, c) => sum + c.solde, 0);

  // Capitaux propres - INCLURE LE RÉSULTAT NET DE L'EXERCICE
  const capitauxLignes = capitaux.map((c) => ({
    compte: c.compte,
    libelle: c.libelle,
    montant: Math.abs(c.solde),
  }));

  // Ajouter le résultat net comme ligne des capitaux propres (compte 13)
  if (resultatNet !== 0) {
    capitauxLignes.push({
      compte: "13",
      libelle: "Résultat de l'exercice",
      montant: resultatNet, // Peut être négatif si perte
    });
  }

  const capitauxPropres: SectionBilan = {
    lignes: capitauxLignes,
    total: capitaux.reduce((sum, c) => sum + Math.abs(c.solde), 0) + resultatNet,
  };

  // Dettes
  const dettes: SectionBilan = {
    lignes: tiersPassif.map((c) => ({
      compte: c.compte,
      libelle: c.libelle,
      montant: Math.abs(c.solde),
    })),
    total: tiersPassif.reduce((sum, c) => sum + Math.abs(c.solde), 0),
  };

  // Trésorerie passif (soldes créditeurs classe 5)
  const tresoPassif =
    tresorerieActif
      .filter((c) => c.solde < 0)
      .reduce((sum, c) => sum + Math.abs(c.solde), 0) +
    tresoreriePassif.reduce((sum, c) => sum + Math.abs(c.solde), 0);

  const totalActif = actifImmobilise.total + actifCirculant.total + tresoActif;
  const totalPassif = capitauxPropres.total + dettes.total + tresoPassif;

  return {
    exercice,
    actif_immobilise: actifImmobilise,
    actif_circulant: actifCirculant,
    tresorerie_actif: tresoActif,
    total_actif: totalActif,
    capitaux_propres: capitauxPropres,
    dettes,
    tresorerie_passif: tresoPassif,
    total_passif: totalPassif,
  };
}

/**
 * Génère le compte de résultat pour un exercice
 */
export async function getCompteResultat(exercice: string): Promise<CompteResultat> {
  const [chargesData, produitsData] = await Promise.all([
    getSoldesByClasse(exercice, CLASSES.CHARGES),
    getSoldesByClasse(exercice, CLASSES.PRODUITS),
  ]);

  // Les charges sont débitrices (solde > 0)
  const charges: LigneResultat[] = chargesData.map((c) => ({
    compte: c.compte,
    libelle: c.libelle,
    montant: Math.abs(c.solde),
  }));

  // Les produits sont créditeurs (solde < 0 car debit - credit)
  const produits: LigneResultat[] = produitsData.map((c) => ({
    compte: c.compte,
    libelle: c.libelle,
    montant: Math.abs(c.solde),
  }));

  const totalCharges = charges.reduce((sum, c) => sum + c.montant, 0);
  const totalProduits = produits.reduce((sum, p) => sum + p.montant, 0);
  const resultatNet = totalProduits - totalCharges;

  return {
    exercice,
    charges,
    produits,
    total_charges: totalCharges,
    total_produits: totalProduits,
    resultat_net: resultatNet,
  };
}

/**
 * Calcule les indicateurs financiers pour un exercice
 */
export async function getIndicateursFinanciers(exercice: string): Promise<Indicateurs> {
  const [bilan, compteResultat] = await Promise.all([
    getBilan(exercice),
    getCompteResultat(exercice),
  ]);

  // Marge brute = (Ventes - Achats) / Ventes * 100
  const ventes = compteResultat.produits
    .filter((p) => p.compte.startsWith("70"))
    .reduce((sum, p) => sum + p.montant, 0);
  const achats = compteResultat.charges
    .filter((c) => c.compte.startsWith("60"))
    .reduce((sum, c) => sum + c.montant, 0);
  const margeBrute = ventes > 0 ? ((ventes - achats) / ventes) * 100 : 0;

  // Marge nette = Résultat / Produits * 100
  const margeNette =
    compteResultat.total_produits > 0
      ? (compteResultat.resultat_net / compteResultat.total_produits) * 100
      : 0;

  // ROE = Résultat / Capitaux propres * 100
  const roe =
    bilan.capitaux_propres.total > 0
      ? (compteResultat.resultat_net / bilan.capitaux_propres.total) * 100
      : 0;

  // Ratio de liquidité = Actif circulant / Dettes court terme
  const ratioLiquidite =
    bilan.dettes.total > 0 ? bilan.actif_circulant.total / bilan.dettes.total : 0;

  // BFR = Actif circulant - Dettes court terme
  const bfr = bilan.actif_circulant.total - bilan.dettes.total;

  // Trésorerie nette = Trésorerie actif - Trésorerie passif
  const tresorerieNette = bilan.tresorerie_actif - bilan.tresorerie_passif;

  // Taux d'endettement = Dettes / Capitaux propres * 100
  const tauxEndettement =
    bilan.capitaux_propres.total > 0
      ? (bilan.dettes.total / bilan.capitaux_propres.total) * 100
      : 0;

  // Autonomie financière = Capitaux propres / Total passif * 100
  const autonomieFinanciere =
    bilan.total_passif > 0 ? (bilan.capitaux_propres.total / bilan.total_passif) * 100 : 0;

  // Délais (simplifiés - basés sur soldes moyens)
  const creancesClients = bilan.actif_circulant.lignes
    .filter((l) => l.compte.startsWith("41"))
    .reduce((sum, l) => sum + l.montant, 0);
  const delaiClient = ventes > 0 ? Math.round((creancesClients / ventes) * 365) : 0;

  const dettesFournisseurs = bilan.dettes.lignes
    .filter((l) => l.compte.startsWith("40"))
    .reduce((sum, l) => sum + l.montant, 0);
  const delaiF = achats > 0 ? Math.round((dettesFournisseurs / achats) * 365) : 0;

  const stocks = bilan.actif_circulant.lignes
    .filter((l) => l.compte.startsWith("3"))
    .reduce((sum, l) => sum + l.montant, 0);
  const rotationStocks = achats > 0 ? Math.round((stocks / achats) * 365) : 0;

  return {
    exercice,
    marge_brute: Math.round(margeBrute * 10) / 10,
    marge_nette: Math.round(margeNette * 10) / 10,
    roe: Math.round(roe * 10) / 10,
    ratio_liquidite: Math.round(ratioLiquidite * 100) / 100,
    bfr: Math.round(bfr),
    tresorerie_nette: Math.round(tresorerieNette),
    taux_endettement: Math.round(tauxEndettement * 10) / 10,
    autonomie_financiere: Math.round(autonomieFinanciere * 10) / 10,
    delai_client: delaiClient,
    delai_fournisseur: delaiF,
    rotation_stocks: rotationStocks,
  };
}
