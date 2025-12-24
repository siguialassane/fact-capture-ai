/**
 * Service d'Audit Comptable avec Gemini
 * 
 * Rôle: Expert Comptable & Commissaire aux Comptes
 * Utilise Gemini pour analyser et détecter les anomalies comptables
 */

import { config } from "../../config/env";
import { supabase } from "../../lib/supabase";
import {
  AUDIT_SYSTEM_PROMPT,
  buildAuditEtatsFinanciersPrompt,
  buildAuditEcriturePrompt,
} from "./prompts";

// Types pour l'audit
export interface AuditAnomalie {
  type: "Classification" | "Calcul" | "Équilibre" | "Cohérence" | "Doublon";
  compte?: string;
  description: string;
  impact: string;
  montant_errone?: number;
  montant_attendu?: number;
  correction_proposee: string;
  reference_syscohada?: string;
}

export interface AuditResult {
  status: "CONFORME" | "ANOMALIE";
  niveau: "OK" | "CRITIQUE" | "MAJEURE" | "MINEURE" | "OBSERVATION";
  anomalies: AuditAnomalie[];
  resume_audit: string;
  points_verification?: string[];
  recommandations: string[];
  timestamp: string;
  duree_ms?: number;
}

/**
 * Appelle Gemini via OpenRouter pour l'audit
 */
async function callGeminiAudit(
  systemPrompt: string,
  userPrompt: string
): Promise<{ result: AuditResult; duration_ms: number }> {
  const startTime = Date.now();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openrouter.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://fact-capture-ai.local",
      "X-Title": "Fact Capture AI - Audit",
    },
    body: JSON.stringify({
      model: config.openrouter.geminiModel || "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1, // Très faible pour la précision
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });

  const duration_ms = Date.now() - startTime;

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Audit Gemini] Erreur API:", response.status, errorText);
    throw new Error(`Erreur API Gemini: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Pas de réponse de Gemini");
  }

  try {
    const result = JSON.parse(content) as AuditResult;
    result.timestamp = new Date().toISOString();
    result.duree_ms = duration_ms;
    return { result, duration_ms };
  } catch (parseError) {
    console.error("[Audit Gemini] Erreur parsing JSON:", parseError);
    // Retourner un résultat par défaut si parsing échoue
    return {
      result: {
        status: "ANOMALIE",
        niveau: "OBSERVATION",
        anomalies: [],
        resume_audit: content,
        recommandations: ["Vérification manuelle recommandée"],
        timestamp: new Date().toISOString(),
        duree_ms: duration_ms,
      },
      duration_ms,
    };
  }
}

/**
 * Récupère les données nécessaires pour l'audit depuis la BD
 */
async function getAuditData(exercice: string) {
  // Récupérer toutes les écritures de l'exercice
  const dateDebut = `${exercice}-01-01`;
  const dateFin = `${exercice}-12-31`;

  const { data: ecritures, error: errEcritures } = await supabase
    .from("journal_entries")
    .select(`
      id,
      date_piece,
      numero_piece,
      journal_code,
      libelle,
      total_debit,
      total_credit,
      journal_entry_lines (
        numero_ligne,
        compte_numero,
        libelle_compte,
        libelle,
        debit,
        credit,
        tiers_code
      )
    `)
    .gte("date_piece", dateDebut)
    .lte("date_piece", dateFin);

  if (errEcritures) {
    console.error("[Audit] Erreur récupération écritures:", errEcritures);
  }

  // Récupérer la dernière facture analysée
  const { data: factures, error: errFactures } = await supabase
    .from("invoices")
    .select("ai_result, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (errFactures) {
    console.error("[Audit] Erreur récupération factures:", errFactures);
  }

  // Calculer les soldes par compte
  const { data: soldes, error: errSoldes } = await supabase
    .from("journal_entry_lines")
    .select(`
      compte_numero,
      debit,
      credit
    `);

  // Agréger les soldes par compte
  const soldesParCompte: Record<string, { debit: number; credit: number; solde: number }> = {};
  
  if (soldes) {
    for (const ligne of soldes) {
      const compte = ligne.compte_numero;
      if (!soldesParCompte[compte]) {
        soldesParCompte[compte] = { debit: 0, credit: 0, solde: 0 };
      }
      soldesParCompte[compte].debit += parseFloat(String(ligne.debit)) || 0;
      soldesParCompte[compte].credit += parseFloat(String(ligne.credit)) || 0;
      soldesParCompte[compte].solde = 
        soldesParCompte[compte].debit - soldesParCompte[compte].credit;
    }
  }

  return {
    ecritures: ecritures || [],
    factures: factures?.map(f => f.ai_result) || [],
    soldesParCompte,
  };
}

/**
 * Construit le bilan à partir des soldes
 */
function construireBilan(soldesParCompte: Record<string, { debit: number; credit: number; solde: number }>) {
  const bilan = {
    actif: {
      immobilise: { total: 0, comptes: [] as { compte: string; solde: number }[] },
      circulant: { total: 0, comptes: [] as { compte: string; solde: number }[] },
      tresorerie: { total: 0, comptes: [] as { compte: string; solde: number }[] },
      total: 0,
    },
    passif: {
      capitaux: { total: 0, comptes: [] as { compte: string; solde: number }[] },
      dettes: { total: 0, comptes: [] as { compte: string; solde: number }[] },
      tresorerie: { total: 0, comptes: [] as { compte: string; solde: number }[] },
      total: 0,
    },
    equilibre: false,
    ecart: 0,
  };

  for (const [compte, data] of Object.entries(soldesParCompte)) {
    const classe = compte.charAt(0);
    const solde = data.solde;
    const entry = { compte, solde };

    switch (classe) {
      case "2": // Immobilisations
        bilan.actif.immobilise.total += Math.abs(solde);
        bilan.actif.immobilise.comptes.push(entry);
        break;
      case "3": // Stocks
        bilan.actif.circulant.total += Math.abs(solde);
        bilan.actif.circulant.comptes.push(entry);
        break;
      case "4": // Tiers
        // Classification fine des comptes de tiers
        if (compte.startsWith("40")) {
          // Fournisseurs → PASSIF
          bilan.passif.dettes.total += Math.abs(solde);
          bilan.passif.dettes.comptes.push(entry);
        } else if (compte.startsWith("41")) {
          // Clients → ACTIF
          bilan.actif.circulant.total += Math.abs(solde);
          bilan.actif.circulant.comptes.push(entry);
        } else if (compte.startsWith("4452") || compte.startsWith("4456")) {
          // TVA récupérable/déductible → ACTIF (créance sur État)
          bilan.actif.circulant.total += Math.abs(solde);
          bilan.actif.circulant.comptes.push(entry);
        } else if (compte.startsWith("443") || compte.startsWith("4431") || compte.startsWith("4432")) {
          // TVA collectée/à payer → PASSIF
          bilan.passif.dettes.total += Math.abs(solde);
          bilan.passif.dettes.comptes.push(entry);
        } else if (compte.startsWith("43") || compte.startsWith("44")) {
          // Autres (organismes sociaux, État) → généralement PASSIF
          bilan.passif.dettes.total += Math.abs(solde);
          bilan.passif.dettes.comptes.push(entry);
        } else {
          // Par défaut selon le solde
          if (solde > 0) {
            bilan.actif.circulant.total += solde;
            bilan.actif.circulant.comptes.push(entry);
          } else {
            bilan.passif.dettes.total += Math.abs(solde);
            bilan.passif.dettes.comptes.push(entry);
          }
        }
        break;
      case "5": // Trésorerie
        if (solde >= 0) {
          bilan.actif.tresorerie.total += solde;
          bilan.actif.tresorerie.comptes.push(entry);
        } else {
          bilan.passif.tresorerie.total += Math.abs(solde);
          bilan.passif.tresorerie.comptes.push(entry);
        }
        break;
      case "1": // Capitaux
        bilan.passif.capitaux.total += Math.abs(solde);
        bilan.passif.capitaux.comptes.push(entry);
        break;
    }
  }

  bilan.actif.total = 
    bilan.actif.immobilise.total + 
    bilan.actif.circulant.total + 
    bilan.actif.tresorerie.total;
  
  bilan.passif.total = 
    bilan.passif.capitaux.total + 
    bilan.passif.dettes.total + 
    bilan.passif.tresorerie.total;

  bilan.ecart = bilan.actif.total - bilan.passif.total;
  bilan.equilibre = Math.abs(bilan.ecart) < 0.01;

  return bilan;
}

/**
 * Construit le compte de résultat à partir des soldes
 */
function construireCompteResultat(soldesParCompte: Record<string, { debit: number; credit: number; solde: number }>) {
  const resultat = {
    charges: { total: 0, comptes: [] as { compte: string; montant: number }[] },
    produits: { total: 0, comptes: [] as { compte: string; montant: number }[] },
    resultat_net: 0,
  };

  for (const [compte, data] of Object.entries(soldesParCompte)) {
    const classe = compte.charAt(0);
    
    if (classe === "6") {
      // Charges (solde débiteur)
      const montant = Math.abs(data.solde);
      resultat.charges.total += montant;
      resultat.charges.comptes.push({ compte, montant });
    } else if (classe === "7") {
      // Produits (solde créditeur)
      const montant = Math.abs(data.solde);
      resultat.produits.total += montant;
      resultat.produits.comptes.push({ compte, montant });
    }
  }

  resultat.resultat_net = resultat.produits.total - resultat.charges.total;
  return resultat;
}

/**
 * Audit des États Financiers
 */
export async function auditEtatsFinanciers(exercice: string): Promise<AuditResult> {
  console.log(`[Audit] Démarrage audit États Financiers ${exercice}...`);

  try {
    // Récupérer les données
    const { ecritures, factures, soldesParCompte } = await getAuditData(exercice);

    // Construire bilan et compte de résultat
    const bilan = construireBilan(soldesParCompte);
    const compteResultat = construireCompteResultat(soldesParCompte);

    // Vérifications préliminaires locales
    const anomaliesLocales: AuditAnomalie[] = [];

    // Vérifier l'équilibre du bilan
    if (!bilan.equilibre) {
      anomaliesLocales.push({
        type: "Équilibre",
        description: `Le bilan n'est pas équilibré. Écart de ${bilan.ecart.toLocaleString()} FCFA`,
        impact: "Les états financiers sont incorrects et ne peuvent être validés",
        montant_errone: bilan.actif.total,
        montant_attendu: bilan.passif.total,
        correction_proposee: "Rechercher les écritures non équilibrées ou les erreurs de classification",
        reference_syscohada: "Art. 8 - Acte Uniforme OHADA: Principe d'équilibre du bilan",
      });
    }

    // Préparer le prompt pour Gemini
    const userPrompt = buildAuditEtatsFinanciersPrompt(
      bilan,
      compteResultat,
      ecritures,
      factures[0] // Dernière facture
    );

    // Appeler Gemini pour l'audit approfondi
    const { result, duration_ms } = await callGeminiAudit(AUDIT_SYSTEM_PROMPT, userPrompt);

    // Fusionner les anomalies locales avec celles de Gemini
    result.anomalies = [...anomaliesLocales, ...result.anomalies];
    
    if (anomaliesLocales.length > 0 && result.status === "CONFORME") {
      result.status = "ANOMALIE";
      result.niveau = "CRITIQUE";
    }

    console.log(`[Audit] Terminé en ${duration_ms}ms - Status: ${result.status}`);
    return result;

  } catch (error) {
    console.error("[Audit] Erreur:", error);
    return {
      status: "ANOMALIE",
      niveau: "CRITIQUE",
      anomalies: [{
        type: "Cohérence",
        description: `Erreur lors de l'audit: ${error instanceof Error ? error.message : "Erreur inconnue"}`,
        impact: "Impossible de valider les états financiers",
        correction_proposee: "Vérifier la connexion et réessayer",
      }],
      resume_audit: "L'audit n'a pas pu être complété en raison d'une erreur technique",
      recommandations: ["Réessayer l'audit", "Vérifier les données sources"],
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Audit d'une écriture comptable spécifique
 */
export async function auditEcriture(
  factureJson: object,
  ecriture: object
): Promise<AuditResult> {
  console.log("[Audit] Audit écriture comptable...");

  try {
    const userPrompt = buildAuditEcriturePrompt(factureJson, ecriture);
    const { result } = await callGeminiAudit(AUDIT_SYSTEM_PROMPT, userPrompt);
    return result;
  } catch (error) {
    console.error("[Audit Écriture] Erreur:", error);
    throw error;
  }
}

/**
 * Audit rapide sans appel à Gemini (vérifications locales uniquement)
 */
export async function auditRapide(exercice: string): Promise<{
  equilibre_bilan: boolean;
  total_actif: number;
  total_passif: number;
  ecart: number;
  nb_ecritures: number;
  alertes: string[];
}> {
  const { soldesParCompte, ecritures } = await getAuditData(exercice);
  const bilan = construireBilan(soldesParCompte);

  const alertes: string[] = [];

  if (!bilan.equilibre) {
    alertes.push(`⚠️ Bilan déséquilibré: écart de ${bilan.ecart.toLocaleString()} FCFA`);
  }

  // Vérifier TVA récupérable mal classée
  for (const [compte, data] of Object.entries(soldesParCompte)) {
    if (compte.startsWith("4452") && data.solde > 0) {
      // TVA récupérable avec solde débiteur = normal (créance)
      // Mais si on la met au passif, c'est une erreur
    }
  }

  return {
    equilibre_bilan: bilan.equilibre,
    total_actif: bilan.actif.total,
    total_passif: bilan.passif.total,
    ecart: bilan.ecart,
    nb_ecritures: ecritures.length,
    alertes,
  };
}
