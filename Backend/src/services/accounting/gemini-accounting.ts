/**
 * Gemini Accounting Service
 * 
 * Ce service utilise Google Gemini avec le mode "thinking/reasoning"
 * pour générer des écritures comptables à partir des données extraites par Qwen.
 * 
 * Le modèle reçoit les données de facture + le contexte comptable SYSCOHADA
 * et génère l'écriture comptable complète.
 */

import type { InvoiceAIResult } from "../ai/types";

// Configuration OpenRouter
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "moonshotai/kimi-k2-thinking";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Structure d'une ligne d'écriture comptable
 */
export interface JournalEntryLine {
  numero_compte: string;
  libelle_compte: string;
  libelle_ligne: string;
  debit: number;
  credit: number;
  tiers_code?: string;
}

/**
 * Structure d'une écriture comptable complète
 */
export interface JournalEntry {
  date_piece: string;
  numero_piece: string;
  journal_code: string;
  journal_libelle: string;
  libelle_general: string;
  tiers_code?: string;
  tiers_nom?: string;
  lignes: JournalEntryLine[];
  total_debit: number;
  total_credit: number;
  equilibre: boolean;
  commentaires?: string;
  reasoning?: string; // Le raisonnement de Gemini
}

/**
 * Résultat de la génération comptable
 */
export interface AccountingResult {
  success: boolean;
  ecriture?: JournalEntry;
  reasoning_details?: {
    thinking_content: string;
    duration_ms?: number;
  };
  suggestions?: string[];
  erreurs?: string[];
}

const ACCOUNTING_CONTEXT = `Tu es un expert-comptable certifié spécialisé dans la comptabilité SYSCOHADA (Système Comptable Ouest-Africain).
Tu travailles pour l'entreprise cible (nom fourni dynamiquement par l'application) basée en Côte d'Ivoire.

## ⚠️⚠️⚠️ RÈGLE CRITIQUE N°1 - IDENTIFICATION VENTE vs ACHAT ⚠️⚠️⚠️

### CONTEXTE IMPORTANT :
Les données JSON que tu reçois proviennent d'une IA d'extraction qui analyse visuellement les factures.
- Le champ "fournisseur" dans le JSON = l'ÉMETTEUR de la facture (celui qui l'a créée)
- Le champ "client" dans le JSON = le DESTINATAIRE de la facture

### RÈGLE DE DÉCISION ABSOLUE :

**NOUS SOMMES : l'entreprise cible (nom fourni dynamiquement)**

Pour déterminer si c'est une VENTE ou un ACHAT, regarde le champ "fournisseur" du JSON :

✅ Si "fournisseur" contient le nom de l'entreprise → **C'EST UNE VENTE** (NOUS avons émis cette facture)
  - Journal : VE (Ventes)
  - Le "client" du JSON = NOTRE CLIENT (il nous doit de l'argent)
  - Comptes : 4111 (Clients) au DÉBIT / 70xx (Ventes) au CRÉDIT / 4431 (TVA collectée) au CRÉDIT

❌ Si "fournisseur" NE contient PAS le nom de l'entreprise → **C'EST UN ACHAT** (nous avons REÇU cette facture)
  - Journal : AC ou BQ ou CA selon le paiement
  - Le "fournisseur" du JSON = notre fournisseur (nous lui devons de l'argent)
  - Comptes : 60xx (Achats) au DÉBIT / 4452 (TVA déductible) au DÉBIT / 4011 ou trésorerie au CRÉDIT


## PLAN COMPTABLE SYSCOHADA - Comptes principaux

### CLASSE 4 - COMPTES DE TIERS
- 401 - Fournisseurs
  - 4011 - Fournisseurs - Achats de biens et prestations de services
- 411 - Clients
  - 4111 - Clients - Ventes de biens ou prestations de services
- 4431 - TVA facturée sur ventes (TVA collectée)
- 4452 - TVA récupérable sur achats (TVA déductible)

### CLASSE 5 - COMPTES DE TRÉSORERIE
- 5211 - Banque Atlantique CI
- 5212 - SGBCI
- 571 - Caisse siège social

### CLASSE 6 - COMPTES DE CHARGES (achats)
- 6011 - Achats de marchandises - Matériel informatique
- 6012 - Achats de marchandises - Accessoires
- 6013 - Achats de marchandises - Consommables
- 6051 - Fournitures non stockables - Eau
- 6052 - Fournitures non stockables - Électricité
- 6053 - Fournitures de bureau
- 6054 - Fournitures informatiques
- 6081 - Transports sur achats
- 6222 - Locations de bâtiments
- 6233 - Maintenance informatique
- 6261 - Téléphone
- 6262 - Internet
- 627 - Frais bancaires

### CLASSE 7 - COMPTES DE PRODUITS (ventes)
- 7011 - Ventes de marchandises - Matériel informatique
- 7012 - Ventes de marchandises - Accessoires
- 7013 - Ventes de marchandises - Consommables
- 7051 - Prestations de services - Installation
- 7052 - Prestations de services - Maintenance

## TAUX DE TVA
- TVA normale: 18%
- TVA réduite: 9%
- Exonéré: 0%

## JOURNAUX COMPTABLES - RÈGLES DE SÉLECTION STRICTES

⚠️ LE CHOIX DU JOURNAL DÉPEND DU MODE DE PAIEMENT, PAS SEULEMENT DU TYPE D'OPÉRATION ⚠️

### CA - Journal de Caisse (PAIEMENTS EN ESPÈCES)
Utiliser pour TOUT document payé en ESPÈCES:
- Tickets de caisse
- Factures avec mention "ESPÈCES", "CASH", "COMPTANT"
- Reçus de caisse
- Tout document où le paiement est immédiat en liquide
→ Contrepartie: compte 571 (Caisse)

### BQ - Journal de Banque (PAIEMENTS PAR BANQUE)
Utiliser pour TOUT document payé par voie bancaire:
- Virements bancaires
- Chèques
- Cartes bancaires
- Prélèvements
- Tout document avec mention "VIREMENT", "CHÈQUE", "CB", "CARTE"
→ Contrepartie: compte 521x (Banque)

### AC - Journal des Achats (FACTURES À CRÉDIT UNIQUEMENT)
Utiliser UNIQUEMENT pour les factures fournisseurs NON PAYÉES:
- Factures avec échéance de paiement
- Factures sans preuve de paiement immédiat
→ Contrepartie: compte 4011 (Fournisseurs)

### VE - Journal des Ventes (FACTURES À CRÉDIT UNIQUEMENT)
Utiliser UNIQUEMENT pour les factures clients NON ENCAISSÉES:
- Factures avec échéance de paiement
- Factures sans preuve d'encaissement immédiat
→ Contrepartie: compte 4111 (Clients)

### OD - Journal des Opérations Diverses
Pour les écritures de régularisation, écritures d'inventaire, etc.

## RÈGLES COMPTABLES SELON LE TYPE DE DOCUMENT

### TICKET DE CAISSE (paiement comptant espèces) → Journal CA
\`\`\`
Débit:  6xxx (Charge)           Montant HT
Débit:  4452 (TVA récupérable)  Montant TVA
Crédit: 571  (Caisse)           Montant TTC
\`\`\`

### FACTURE FOURNISSEUR PAYÉE PAR CARTE/VIREMENT → Journal BQ
\`\`\`
Débit:  6xxx (Charge)           Montant HT
Débit:  4452 (TVA récupérable)  Montant TVA
Crédit: 521x (Banque)           Montant TTC
\`\`\`

### FACTURE FOURNISSEUR À CRÉDIT (non payée) → Journal AC
\`\`\`
Débit:  6xxx (Charge)           Montant HT
Débit:  4452 (TVA récupérable)  Montant TVA
Crédit: 4011 (Fournisseurs)     Montant TTC
\`\`\`

### FACTURE CLIENT À CRÉDIT (non encaissée) → Journal VE
\`\`\`
Débit:  4111 (Clients)          Montant TTC
Crédit: 7xxx (Produit)          Montant HT
Crédit: 4431 (TVA collectée)    Montant TVA
\`\`\`

### VENTE ENCAISSÉE COMPTANT EN ESPÈCES → Journal CA
\`\`\`
Débit:  571  (Caisse)           Montant TTC
Crédit: 7xxx (Produit)          Montant HT
Crédit: 4431 (TVA collectée)    Montant TVA
\`\`\`

## INDICES POUR DÉTECTER LE TYPE DE DOCUMENT

### C'est un TICKET DE CAISSE si:
- Le document contient "TICKET", "CAISSE", "CASH REGISTER"
- Il y a un numéro de ticket (ex: TICKET-XXXXX)
- Présence de "ESPÈCES", "CASH", "COMPTANT"
- Il y a "RENDU MONNAIE" ou "MONNAIE"
- Format compact sans conditions de paiement

### C'est une FACTURE À CRÉDIT si:
- Mention d'une ÉCHÉANCE de paiement
- "À PAYER AVANT LE..."
- "NET À PAYER SOUS X JOURS"
- Présence de RIB ou IBAN pour virement
- Format structuré avec conditions de paiement

### C'est un PAIEMENT BANCAIRE si:
- Mention "CARTE BANCAIRE", "CB", "VISA", "MASTERCARD"
- Mention "VIREMENT", "CHÈQUE"
- Référence de transaction bancaire

## Principes:
- Une écriture doit TOUJOURS être équilibrée (Total Débit = Total Crédit)
- Le libellé doit mentionner le numéro de facture/ticket et le nom du tiers
- Utiliser le compte de charge/produit le plus approprié selon la nature des articles
`;

/**
 * Prompt pour générer l'écriture comptable
 */
function buildAccountingPrompt(
  invoiceData: InvoiceAIResult,
  options?: { statutPaiement?: "paye" | "non_paye" | "partiel" | "inconnu"; montantPartiel?: number }
): string {
  const jsonData = JSON.stringify(invoiceData, null, 2);
  const statutPaiement = options?.statutPaiement || "inconnu";
  const montantPartiel = options?.montantPartiel;

  return `## DONNÉES DE LA FACTURE À COMPTABILISER

\`\`\`json
${jsonData}
\`\`\`

## TA MISSION

Analyse cette facture/ticket et génère l'écriture comptable correspondante en respectant les règles SYSCOHADA.

### Étapes à suivre DANS CET ORDRE:

0. **STATUT DE PAIEMENT CONFIRMÉ PAR L'UTILISATEUR** (prioritaire si fourni):
  - statut: ${statutPaiement}
  ${statutPaiement === "partiel" && typeof montantPartiel === "number" ? `- montant déjà payé: ${montantPartiel}` : ""}

1. **IDENTIFIE LE TYPE DE DOCUMENT**:
   - Est-ce un TICKET DE CAISSE ? (mot "TICKET", numéro style TICKET-XXXXX, format compact, "RENDU MONNAIE")
   - Est-ce une FACTURE ? (mot "FACTURE", numéro style FAC-XXXX, format structuré)
   - Est-ce un REÇU ? (mot "REÇU", preuve de paiement)

2. **DÉTERMINE LE MODE DE PAIEMENT**:
   - ESPÈCES/COMPTANT → Journal CA, contrepartie 571 (Caisse)
   - CARTE BANCAIRE/VIREMENT/CHÈQUE → Journal BQ, contrepartie 521x (Banque)
   - À CRÉDIT (avec échéance) → Journal AC ou VE, contrepartie 4011 ou 4111

3. **IDENTIFIE LE SENS** (achat ou vente):
   - C'est un ACHAT si: on achète quelque chose à un fournisseur
   - C'est une VENTE si: on vend quelque chose à un client

4. **CALCULE LES MONTANTS**:
   - Montant HT
   - TVA (18% généralement)
   - Montant TTC

5. **GÉNÈRE L'ÉCRITURE** avec le BON JOURNAL et la BONNE CONTREPARTIE

### RÈGLE SPÉCIALE - PAIEMENT PARTIEL
Si statut = "partiel":
- Écris une seule écriture équilibrée incluant:
  - La dette/creance totale (4011 ou 4111) POUR LE SOLDE RESTANT
  - La trésorerie (521x ou 571) POUR LE MONTANT DÉJÀ PAYÉ
  - Les comptes de charges/produits + TVA sur le TOTAL TTC

### RAPPEL CRITIQUE DES JOURNAUX:

| Type document | Paiement | Journal | Contrepartie |
|--------------|----------|---------|--------------|
| Ticket caisse (achat) | Espèces | CA | 571 Caisse |
| Facture achat | Carte/Virement | BQ | 521x Banque |
| Facture achat | À crédit | AC | 4011 Fournisseurs |
| Ticket caisse (vente) | Espèces | CA | 571 Caisse |
| Facture vente | À crédit | VE | 4111 Clients |

### Format de réponse (JSON STRICT):

\`\`\`json
{
  "type_document": "ticket_caisse" | "facture" | "recu",
  "mode_paiement": "especes" | "carte_bancaire" | "virement" | "cheque" | "credit",
  "type_operation": "achat" | "vente",
  "date_piece": "YYYY-MM-DD",
  "numero_piece": "numéro de la facture ou ticket",
  "journal_code": "CA" | "BQ" | "AC" | "VE" | "OD",
  "journal_libelle": "Journal de Caisse" | "Journal de Banque" | "Journal des Achats" | "Journal des Ventes",
  "libelle_general": "Description de l'opération",
  "tiers_code": "code tiers si identifié",
  "tiers_nom": "nom du fournisseur ou client",
  "lignes": [
    {
      "numero_compte": "XXXX",
      "libelle_compte": "Nom du compte",
      "libelle_ligne": "Description de la ligne",
      "debit": 0.00,
      "credit": 0.00
    }
  ],
  "total_debit": 0.00,
  "total_credit": 0.00,
  "equilibre": true,
  "commentaires": "Remarques sur l'écriture",
  "suggestions": ["suggestion 1", "suggestion 2"]
}
\`\`\`

IMPORTANT: 
- Réponds UNIQUEMENT avec le JSON, pas de texte avant ou après
- Assure-toi que total_debit = total_credit
- Les montants doivent être des nombres (pas de chaînes)
- UN TICKET DE CAISSE = JOURNAL CA avec 571 Caisse, JAMAIS AC avec 4011 Fournisseurs !`;
}

/**
 * Interface pour le contexte comptable depuis la DB
 */
interface AccountingContext {
  plan_comptable: Array<{
    numero_compte: string;
    libelle: string;
    classe: number;
    type_compte: string;
    sens_normal: string;
  }>;
  tiers: Array<{
    code: string;
    nom: string;
    type_tiers: string;
    numero_compte_defaut: string;
  }>;
  taux_tva: Array<{
    code: string;
    taux: number;
    libelle: string;
  }>;
  journaux: Array<{
    code: string;
    libelle: string;
    type_journal: string;
  }>;
  entreprise: {
    nom: string;
    forme_juridique: string;
    adresse: string;
    ville: string;
    pays: string;
  } | null;
}

/**
 * Génère le contexte comptable dynamique depuis la DB
 */
function buildDynamicAccountingContext(dbContext?: AccountingContext): string {
  if (!dbContext) {
    return ACCOUNTING_CONTEXT;
  }

  const { plan_comptable, tiers, taux_tva, journaux, entreprise } = dbContext;

  // Grouper les comptes par classe
  const comptesParClasse = plan_comptable.reduce((acc, c) => {
    if (!acc[c.classe]) acc[c.classe] = [];
    acc[c.classe].push(c);
    return acc;
  }, {} as Record<number, typeof plan_comptable>);

  // Formater les tiers
  const fournisseurs = tiers.filter(t => t.type_tiers === 'fournisseur');
  const clients = tiers.filter(t => t.type_tiers === 'client');

  const entrepriseNom = entreprise?.nom?.trim() || "EXIAS - Solutions Informatiques";
  const entrepriseLieu = entreprise ? `${entreprise.ville}, ${entreprise.pays}` : "Abidjan, Côte d'Ivoire";
  const entrepriseForme = entreprise?.forme_juridique || "";

  return `Tu es un expert-comptable certifié spécialisé dans la comptabilité SYSCOHADA (Système Comptable Ouest-Africain).
Tu travailles pour l'entreprise ${entrepriseNom}${entrepriseForme ? ` (${entrepriseForme})` : ""}, basée à ${entrepriseLieu}.

## ⚠️⚠️⚠️ RÈGLE CRITIQUE N°1 - IDENTIFICATION VENTE vs ACHAT ⚠️⚠️⚠️

**NOTRE ENTREPRISE : ${entrepriseNom}**

Les données JSON que tu reçois contiennent un champ "fournisseur" qui représente l'ÉMETTEUR de la facture.

### RÈGLE DE DÉCISION ABSOLUE :

✅ Si le champ "fournisseur" contient le nom de notre entreprise (${entrepriseNom}) → **C'EST UNE VENTE** (nous avons ÉMIS cette facture)
   - Journal : VE (Ventes) si à crédit, BQ si payée par banque, CA si espèces
   - Le "client" du JSON = NOTRE CLIENT (il nous doit de l'argent)
   - Comptes : 4111 (Clients) au DÉBIT / 70xx (Ventes) au CRÉDIT / 4431 (TVA collectée) au CRÉDIT

❌ Si le champ "fournisseur" NE contient PAS le nom de notre entreprise → **C'EST UN ACHAT** (nous avons REÇU cette facture)
   - Journal : AC si à crédit, BQ si payée par banque, CA si espèces
   - Le "fournisseur" du JSON = notre fournisseur (nous lui devons de l'argent)
   - Comptes : 60xx (Achats) au DÉBIT / 4452 (TVA déductible) au DÉBIT / 4011 ou trésorerie au CRÉDIT

## PLAN COMPTABLE SYSCOHADA - Comptes disponibles

### CLASSE 4 - COMPTES DE TIERS
${(comptesParClasse[4] || []).map(c => `- ${c.numero_compte} - ${c.libelle}`).join('\n')}

### CLASSE 5 - COMPTES DE TRÉSORERIE
${(comptesParClasse[5] || []).map(c => `- ${c.numero_compte} - ${c.libelle}`).join('\n')}

### CLASSE 6 - COMPTES DE CHARGES (pour les ACHATS)
${(comptesParClasse[6] || []).map(c => `- ${c.numero_compte} - ${c.libelle}`).join('\n')}

### CLASSE 7 - COMPTES DE PRODUITS (pour les VENTES)
${(comptesParClasse[7] || []).map(c => `- ${c.numero_compte} - ${c.libelle}`).join('\n')}

## TAUX DE TVA
${taux_tva.map(t => `- ${t.libelle}: ${t.taux}%`).join('\n')}

## JOURNAUX COMPTABLES
${journaux.map(j => `- ${j.code} - ${j.libelle} (${j.type_journal})`).join('\n')}

## RÈGLES COMPTABLES - ACHATS (quand fournisseur n'est PAS notre entreprise)

### ACHAT - Ticket de caisse (espèces) → Journal CA
Débit: 6xxx (Charge) HT | Débit: 4452 (TVA déductible) | Crédit: 571 (Caisse) TTC

### ACHAT - Facture à crédit → Journal AC  
Débit: 6xxx (Charge) HT | Débit: 4452 (TVA déductible) | Crédit: 4011 (Fournisseurs) TTC

### ACHAT - Facture payée par banque → Journal BQ
Débit: 6xxx (Charge) HT | Débit: 4452 (TVA déductible) | Crédit: 521x (Banque) TTC

## RÈGLES COMPTABLES - VENTES (quand fournisseur EST notre entreprise)

### VENTE - Facture client à crédit → Journal VE
Débit: 4111 (Clients) TTC | Crédit: 70xx (Ventes) HT | Crédit: 4431 (TVA collectée)

### VENTE - Encaissement espèces → Journal CA
Débit: 571 (Caisse) TTC | Crédit: 70xx (Ventes) HT | Crédit: 4431 (TVA collectée)

### VENTE - Encaissement bancaire → Journal BQ
Débit: 521x (Banque) TTC | Crédit: 70xx (Ventes) HT | Crédit: 4431 (TVA collectée)

## TIERS ENREGISTRÉS

### Fournisseurs connus:
${fournisseurs.map(f => `- ${f.code}: ${f.nom} (compte: ${f.numero_compte_defaut || '4011'})`).join('\n')}

### Clients connus:
${clients.map(c => `- ${c.code}: ${c.nom} (compte: ${c.numero_compte_defaut || '4111'})`).join('\n')}

## Principes:
- TOUJOURS vérifier si fournisseur = ${entrepriseNom} pour déterminer VENTE vs ACHAT
- Une écriture doit TOUJOURS être équilibrée (Total Débit = Total Crédit)
- Le libellé doit mentionner le numéro de facture et le nom du tiers
`;
}

/**
 * Appelle Gemini avec le mode reasoning pour générer l'écriture comptable
 */
export async function generateAccountingEntry(
  invoiceData: InvoiceAIResult,
  dbContext?: AccountingContext,
  options?: { statutPaiement?: "paye" | "non_paye" | "partiel" | "inconnu"; montantPartiel?: number }
): Promise<AccountingResult> {
  if (!OPENROUTER_API_KEY) {
    return {
      success: false,
      erreurs: ["OPENROUTER_API_KEY non configurée"],
    };
  }

  const startTime = Date.now();

  try {
    console.log("[Gemini Accounting] Génération de l'écriture comptable...");

    // Premier appel avec reasoning
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3001",
        "X-Title": "Fact Capture AI - Accounting",
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          {
            role: "system",
            content: buildDynamicAccountingContext(dbContext),
          },
          {
            role: "user",
            content: buildAccountingPrompt(invoiceData, options),
          },
        ],
        reasoning: { enabled: true },
        temperature: 0.1, // Plus déterministe pour la comptabilité
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Gemini Accounting] Erreur API:", errorText);
      return {
        success: false,
        erreurs: [`Erreur API: ${response.status} - ${errorText}`],
      };
    }

    const result = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string;
          reasoning_details?: { thinking_content?: string };
          reasoning_content?: string;
        };
      }>;
    };
    const assistantMessage = result.choices?.[0]?.message;

    if (!assistantMessage) {
      return {
        success: false,
        erreurs: ["Pas de réponse de Gemini"],
      };
    }

    const duration = Date.now() - startTime;

    // Extraire le raisonnement
    const reasoningContent = assistantMessage.reasoning_details?.thinking_content ||
      assistantMessage.reasoning_content ||
      "Raisonnement non disponible";

    // Parser le JSON de la réponse
    let content = assistantMessage.content || "";

    // Nettoyer le JSON (enlever les balises markdown si présentes)
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    let entryData: any;
    try {
      entryData = JSON.parse(content);
    } catch (parseError) {
      console.error("[Gemini Accounting] Erreur parsing JSON:", parseError);
      console.log("[Gemini Accounting] Contenu brut:", content);
      return {
        success: false,
        reasoning_details: {
          thinking_content: reasoningContent,
          duration_ms: duration,
        },
        erreurs: ["Impossible de parser la réponse JSON de Gemini"],
      };
    }

    // Construire l'écriture comptable
    const ecriture: JournalEntry = {
      date_piece: entryData.date_piece || invoiceData.date_facture || new Date().toISOString().split("T")[0],
      numero_piece: entryData.numero_piece || invoiceData.numero_facture || "SANS_NUM",
      journal_code: entryData.journal_code || "OD",
      journal_libelle: entryData.journal_libelle || "Journal des Opérations Diverses",
      libelle_general: entryData.libelle_general || `Facture ${invoiceData.fournisseur || invoiceData.client || ""}`,
      tiers_code: entryData.tiers_code,
      tiers_nom: entryData.tiers_nom || invoiceData.fournisseur || invoiceData.client,
      lignes: entryData.lignes || [],
      total_debit: entryData.total_debit || 0,
      total_credit: entryData.total_credit || 0,
      equilibre: Math.abs((entryData.total_debit || 0) - (entryData.total_credit || 0)) < 0.01,
      commentaires: entryData.commentaires,
      reasoning: reasoningContent,
    };

    console.log("[Gemini Accounting] Écriture générée avec succès");

    return {
      success: true,
      ecriture,
      reasoning_details: {
        thinking_content: reasoningContent,
        duration_ms: duration,
      },
      suggestions: entryData.suggestions || [],
    };
  } catch (error) {
    console.error("[Gemini Accounting] Erreur:", error);
    return {
      success: false,
      erreurs: [`Erreur: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

/**
 * Affine l'écriture avec un dialogue supplémentaire (multi-turn reasoning)
 */
export async function refineAccountingEntry(
  previousEntry: JournalEntry,
  userFeedback: string,
  originalInvoiceData: InvoiceAIResult
): Promise<AccountingResult> {
  if (!OPENROUTER_API_KEY) {
    return {
      success: false,
      erreurs: ["OPENROUTER_API_KEY non configurée"],
    };
  }

  const startTime = Date.now();

  try {
    // Messages avec historique pour le multi-turn reasoning
    const messages = [
      {
        role: "system" as const,
        content: ACCOUNTING_CONTEXT,
      },
      {
        role: "user" as const,
        content: buildAccountingPrompt(originalInvoiceData),
      },
      {
        role: "assistant" as const,
        content: JSON.stringify(previousEntry, null, 2),
        reasoning_details: previousEntry.reasoning ? { thinking_content: previousEntry.reasoning } : undefined,
      },
      {
        role: "user" as const,
        content: `Correction demandée: ${userFeedback}\n\nMerci de régénérer l'écriture comptable en tenant compte de cette remarque. Réponds uniquement avec le JSON corrigé.`,
      },
    ];

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL || "http://localhost:3001",
        "X-Title": "Fact Capture AI - Accounting Refinement",
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages,
        reasoning: { enabled: true },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        erreurs: [`Erreur API: ${response.status} - ${errorText}`],
      };
    }

    const result = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string;
          reasoning_details?: { thinking_content?: string };
        };
      }>;
    };
    const assistantMessage = result.choices?.[0]?.message;
    const duration = Date.now() - startTime;

    const reasoningContent = assistantMessage?.reasoning_details?.thinking_content || "Raisonnement non disponible";

    let content = assistantMessage?.content || "";
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    const entryData = JSON.parse(content);

    const ecriture: JournalEntry = {
      date_piece: entryData.date_piece || previousEntry.date_piece,
      numero_piece: entryData.numero_piece || previousEntry.numero_piece,
      journal_code: entryData.journal_code || previousEntry.journal_code,
      journal_libelle: entryData.journal_libelle || previousEntry.journal_libelle,
      libelle_general: entryData.libelle_general || previousEntry.libelle_general,
      tiers_code: entryData.tiers_code || previousEntry.tiers_code,
      tiers_nom: entryData.tiers_nom || previousEntry.tiers_nom,
      lignes: entryData.lignes || previousEntry.lignes,
      total_debit: entryData.total_debit || 0,
      total_credit: entryData.total_credit || 0,
      equilibre: Math.abs((entryData.total_debit || 0) - (entryData.total_credit || 0)) < 0.01,
      commentaires: entryData.commentaires,
      reasoning: reasoningContent,
    };

    return {
      success: true,
      ecriture,
      reasoning_details: {
        thinking_content: reasoningContent,
        duration_ms: duration,
      },
      suggestions: entryData.suggestions || [],
    };
  } catch (error) {
    return {
      success: false,
      erreurs: [`Erreur: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}
