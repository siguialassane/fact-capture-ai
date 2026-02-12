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
const DEFAULT_ACCOUNTING_MODEL = "google/gemini-2.5-flash"; // Par défaut: Gemini 2.5 Flash
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Modèles IA disponibles pour la comptabilité
export const AVAILABLE_MODELS = {
  GEMINI_2_5_FLASH: "google/gemini-2.5-flash",
  GEMINI_3_FLASH: "google/gemini-3-flash-preview",
} as const;

export type AccountingModel = typeof AVAILABLE_MODELS[keyof typeof AVAILABLE_MODELS];

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

const ACCOUNTING_CONTEXT = `# EXPERT-COMPTABLE SYSCOHADA - Côte d'Ivoire

Tu es un expert-comptable certifié spécialisé en comptabilité SYSCOHADA.
Tu génères des écritures comptables à partir de factures extraites par IA.

---

## 1. IDENTIFICATION VENTE vs ACHAT

**NOUS SOMMES : l'entreprise cible (nom fourni dynamiquement)**

| Champ "fournisseur" du JSON | Type opération | Journal |
|-----------------------------|----------------|---------|
| Contient nom entreprise     | VENTE          | VE ou BQ ou CA |
| Ne contient PAS             | ACHAT          | AC ou BQ ou CA |

---

## 2. PLAN COMPTABLE - COMPTES À UTILISER

### CLASSE 4 - TIERS
| Compte | Libellé | Usage |
|--------|---------|-------|
| 4011   | Fournisseurs | Dettes fournisseurs (crédit) |
| 4111   | Clients | Créances clients (débit) |
| 4431   | TVA collectée | TVA sur ventes (crédit) |
| 4452   | TVA déductible | TVA sur achats (débit) |

### CLASSE 5 - TRÉSORERIE
| Compte | Libellé | Usage |
|--------|---------|-------|
| 5211   | Banque Atlantique CI | Paiements bancaires |
| 5212   | SGBCI | Paiements bancaires |
| 571    | Caisse | Paiements espèces |

### CLASSE 6 - CHARGES (Achats)
| Compte | Libellé | Articles concernés |
|--------|---------|-------------------|
| 6011   | Achats - Matériel informatique | Ordinateurs, serveurs, imprimantes |
| 6012   | Achats - Accessoires | Écrans, claviers, souris, scanners |
| 6013   | Achats - Consommables | Cartouches, papier |
| 6014   | Achats - Mobilier | Chaises, bureaux |
| 6015   | Achats - Équipements électriques | Onduleurs, multiprises |
| 6016   | Achats - Logiciels | Licences, abonnements |
| 6051   | Eau | Factures eau |
| 6052   | Électricité | Factures électricité |
| 6053   | Fournitures de bureau | Papeterie |
| 6081   | Transports sur achats | Frais livraison |
| 6222   | Locations | Loyers |
| 6261   | Téléphone | Factures téléphone |
| 6262   | Internet | Factures internet |
| 627    | Frais bancaires | Commissions, agios |

### CLASSE 7 - PRODUITS (Ventes)
| Compte | Libellé | Articles concernés |
|--------|---------|-------------------|
| 7011   | Ventes - Matériel informatique | Ordinateurs, PC, serveurs, imprimantes |
| 7012   | Ventes - Accessoires informatiques | Écrans, claviers, souris, scanners, câbles |
| 7013   | Ventes - Consommables | Cartouches, papier, CD/DVD |
| 7014   | Ventes - Mobilier de bureau | Chaises, bureaux, rangements |
| 7015   | Ventes - Équipements électriques | Onduleurs, multiprises, stabilisateurs |
| 7016   | Ventes - Logiciels | Licences logiciels, abonnements SaaS |
| 7051   | Services - Installation | Installation matériel |
| 7052   | Services - Maintenance | Contrats maintenance |
| 7053   | Services - Formation | Formations, coaching |

---

## 3. ⚠️⚠️⚠️ RÈGLE CRITIQUE: VENTILATION OBLIGATOIRE ⚠️⚠️⚠️

**OBLIGATION ABSOLUE**: Pour CHAQUE catégorie de produit dans la facture, créer UNE LIGNE COMPTABLE SÉPARÉE.

### Exemple de Classification des Articles:
| Article sur facture | Compte |
|--------------------|--------|
| Ordinateur portable, PC, Desktop | 7011 |
| Imprimante, Scanner | 7011 |
| Écran, Moniteur | 7012 |
| Clavier, Souris, Casque | 7012 |
| Douchette code-barres, Scanner code-barres | 7012 |
| Câbles, Hub USB | 7012 |
| Cartouches, Toner | 7013 |
| Chaise de bureau, Fauteuil | 7014 |
| Bureau, Table | 7014 |
| Onduleur, UPS | 7015 |
| Multiprise, Rallonge | 7015 |
| Licence logiciel, Abonnement | 7016 |

### Exemple Concret de Ventilation:
Facture avec: 2 PC (1,100,000) + 1 Scanner (180,000) + 1 Licence (450,000) + 1 Chaise (275,000)

**MAUVAIS** (tout regroupé):
\`\`\`
7011 Ventes matériel   2,005,000 (CRÉDIT)  ❌ INTERDIT
\`\`\`

**CORRECT** (ventilé par catégorie):
\`\`\`
7011 Ventes matériel informatique  1,100,000 (CRÉDIT) - PC
7012 Ventes accessoires             180,000 (CRÉDIT) - Scanner
7016 Ventes logiciels               450,000 (CRÉDIT) - Licence
7014 Ventes mobilier                275,000 (CRÉDIT) - Chaise
\`\`\`

---

## 4. JOURNAUX COMPTABLES

### Sélection du Journal selon le paiement:
| Mode Paiement | Journal | Contrepartie |
|---------------|---------|--------------|
| Espèces, Cash | CA      | 571 Caisse |
| Virement, Chèque, Carte | BQ | 521x Banque |
| À crédit (achat) | AC   | 4011 Fournisseurs |
| À crédit (vente) | VE   | 4111 Clients |
| Régularisation | OD    | Variable |

---

## 5. SCHÉMAS D'ÉCRITURES

### VENTE payée par Banque (Virement) → Journal BQ
\`\`\`
Débit:  521x (Banque)           Montant TTC
Crédit: 70xx (Produits)         Montant HT (ventilé par catégorie!)
Crédit: 4431 (TVA collectée)    Montant TVA
\`\`\`

### VENTE à Crédit → Journal VE
\`\`\`
Débit:  4111 (Clients)          Montant TTC
Crédit: 70xx (Produits)         Montant HT (ventilé par catégorie!)
Crédit: 4431 (TVA collectée)    Montant TVA
\`\`\`

### VENTE en Espèces → Journal CA
\`\`\`
Débit:  571 (Caisse)            Montant TTC
Crédit: 70xx (Produits)         Montant HT (ventilé par catégorie!)
Crédit: 4431 (TVA collectée)    Montant TVA
\`\`\`

### ACHAT payé par Banque → Journal BQ
\`\`\`
Débit:  60xx (Charges)          Montant HT (ventilé par catégorie!)
Débit:  4452 (TVA déductible)   Montant TVA
Crédit: 521x (Banque)           Montant TTC
\`\`\`

### ACHAT à Crédit → Journal AC
\`\`\`
Débit:  60xx (Charges)          Montant HT (ventilé par catégorie!)
Débit:  4452 (TVA déductible)   Montant TVA
Crédit: 4011 (Fournisseurs)     Montant TTC
\`\`\`

### ACHAT en Espèces → Journal CA
\`\`\`
Débit:  60xx (Charges)          Montant HT (ventilé par catégorie!)
Débit:  4452 (TVA déductible)   Montant TVA
Crédit: 571 (Caisse)            Montant TTC
\`\`\`

---

## 6. TVA
- Taux normal: 18%
- Taux réduit: 9%
- Exonéré: 0%

---

## 7. RÈGLES FONDAMENTALES
1. **Équilibre**: Total Débit = Total Crédit (TOUJOURS)
2. **Ventilation**: Une ligne par catégorie de produit (OBLIGATOIRE)
3. **Libellé**: Inclure n° facture et nom tiers
4. **Sens**: Charges (6xxx) au DÉBIT / Produits (7xxx) au CRÉDIT
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
- UN TICKET DE CAISSE = JOURNAL CA avec 571 Caisse, JAMAIS AC avec 4011 Fournisseurs !

## ⚠️⚠️⚠️ RAPPEL ABSOLU - VENTILATION OBLIGATOIRE ⚠️⚠️⚠️

Tu DOIS créer UNE LIGNE COMPTABLE SÉPARÉE pour CHAQUE TYPE de produit différent sur la facture.

**INTERDIT**: Regrouper des articles de catégories différentes sur un seul compte.

**Vérifie CHAQUE article de la facture et classe-le**:
- Ordinateur, PC, Imprimante → 7011 (Matériel informatique)
- Scanner, Écran, Clavier, Souris → 7012 (Accessoires)
- Cartouches, Papier → 7013 (Consommables)
- Chaise, Bureau, Table → 7014 (Mobilier)
- Onduleur, Multiprise → 7015 (Équipements électriques)
- Licence, Logiciel, Abonnement → 7016 (Logiciels)
- Installation, Maintenance → 7051/7052 (Services)

**Exemple avec 4 articles différents** = **4 lignes de crédit** (+ 1 TVA + 1 contrepartie)

Ne JAMAIS abréger ou simplifier la ventilation.`;
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
  options?: { 
    statutPaiement?: "paye" | "non_paye" | "partiel" | "inconnu"; 
    montantPartiel?: number;
    model?: AccountingModel; // Modèle IA à utiliser
  }
): Promise<AccountingResult> {
  if (!OPENROUTER_API_KEY) {
    return {
      success: false,
      erreurs: ["OPENROUTER_API_KEY non configurée"],
    };
  }

  const startTime = Date.now();
  const selectedModel = options?.model || DEFAULT_ACCOUNTING_MODEL;

  try {
    console.log(`[Gemini Accounting] Génération de l'écriture comptable avec ${selectedModel}...`);

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
        model: selectedModel,
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
        temperature: 0, // STRICTEMENT déterministe pour garantir la cohérence
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
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
  originalInvoiceData: InvoiceAIResult,
  model?: AccountingModel
): Promise<AccountingResult> {
  if (!OPENROUTER_API_KEY) {
    return {
      success: false,
      erreurs: ["OPENROUTER_API_KEY non configurée"],
    };
  }

  const startTime = Date.now();
  const selectedModel = model || DEFAULT_ACCOUNTING_MODEL;

  console.log(`[Gemini Accounting - Refine] Utilisation du modèle: ${selectedModel}`);

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
        model: selectedModel,
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
