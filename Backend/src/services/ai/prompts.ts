/**
 * AI prompts for invoice extraction and chat.
 *
 * Goal: extract the accounting data needed to prepare journal entries.
 */

// Fixed exchange rates used for FCFA conversion.
export const EXCHANGE_RATES: Record<string, number> = {
  EUR: 656,
  USD: 620,
  GBP: 790,
  CHF: 700,
  CNY: 85,
  XOF: 1,
  FCFA: 1,
};

/**
 * Main prompt for accounting-oriented invoice extraction.
 */
export const INVOICE_ANALYSIS_PROMPT = `Tu es un assistant comptable.
Analyse cette facture et extrais les informations necessaires pour une ecriture comptable.

OBJECTIF:
Preparer des donnees fiables pour qu'un comptable ou une autre IA puisse produire l'ecriture comptable.

INFORMATIONS ESSENTIELLES A EXTRAIRE:

1. IDENTIFICATION DU DOCUMENT
- type_document: facture, avoir, devis, proforma, ticket
- numero_facture
- date_facture
- date_echeance

2. PARTIES CONCERNEES
- fournisseur: nom complet, RCCM, NCC/NIF/IDU si visible, adresse, telephone, email
- client: nom et adresse si visible

3. MONTANTS FINANCIERS
- total_ht
- total_tva
- montant_total
- devise
- verifier que HT + TVA = TTC

4. DETAIL DES LIGNES
- designation
- quantite
- unite
- prix_unitaire_ht
- taux_tva
- montant_ht
- montant_tva
- montant_ttc

5. PAIEMENT
Detecte le mode de paiement:
- especes
- carte_bancaire
- virement
- cheque
- prelevement
- credit

Indices utiles:
- "ESPECES", "CASH", "COMPTANT" -> especes
- "CB", "CARTE", "VISA", "MASTERCARD", "TPE" -> carte_bancaire
- "VIREMENT", "SEPA", "BANK TRANSFER", "WIRE" -> virement
- "CHEQUE", "CHECK", "CHQ" -> cheque
- "PRELEVEMENT", "DIRECT DEBIT", "MANDAT" -> prelevement
- "A CREDIT", "NET A PAYER", "ECHEANCE", "30 JOURS" -> credit

Si aucun mode n'est detecte:
- ticket de caisse -> presumer "especes"
- facture avec echeance ou sans preuve de paiement -> presumer "credit"

6. DEVISE
- FCFA / XOF / CFA / F CFA -> "FCFA" ou "XOF"
- EUR / EURO / EUR -> "EUR"
- USD / Dollar / $ -> "USD"
- autres si clairement visibles

FORMAT JSON STRICT A RETOURNER:
{
  "is_invoice": true,
  "type_document": "facture",
  "type_facture": "achat | vente | avoir | inconnu",
  "numero_facture": "Numero exact",
  "date_facture": "JJ/MM/AAAA",
  "date_echeance": "JJ/MM/AAAA",
  "fournisseur": "Nom complet",
  "rccm_fournisseur": "RCCM",
  "ncc_fournisseur": "NCC/NIF/IDU",
  "adresse_fournisseur": "Adresse complete",
  "telephone_fournisseur": "Telephone",
  "email_fournisseur": "Email",
  "client": "Nom du client",
  "adresse_client": "Adresse du client",
  "articles": [
    {
      "designation": "Description",
      "quantite": "3",
      "unite": "unite",
      "prix_unitaire_ht": "485000",
      "taux_tva": "18%",
      "montant_ht": "1455000",
      "montant_tva": "261900",
      "montant_ttc": "1716900"
    }
  ],
  "total_ht": "2080000",
  "tva_details": [
    {
      "taux": "18%",
      "base_ht": "2080000",
      "montant_tva": "374400"
    }
  ],
  "total_tva": "374400",
  "montant_total": "2454400",
  "devise": "XOF",
  "devise_origine": "XOF",
  "remise": "",
  "acompte": "",
  "reste_a_payer": "2454400",
  "mode_paiement": "virement",
  "conditions_paiement": "Paiement par virement sous 7 jours",
  "rib_iban": "",
  "infos_complementaires": {
    "toute_autre_info_utile": "valeur"
  },
  "ai_comment": "Verification comptable et observations",
  "donnees_manquantes": ["ncc_fournisseur", "rib_iban"]
}

REGLES OBLIGATOIRES:
1. Reponds avec du JSON pur uniquement. Pas de markdown. Pas de texte avant ou apres.
2. Toutes les cles et toutes les valeurs texte doivent etre dans des guillemets JSON valides.
3. Pas de commentaire, pas de texte libre, pas de parentheses explicatives dans le JSON.
4. "donnees_manquantes" doit etre un tableau de chaines simples uniquement.
5. Dans "donnees_manquantes", mets seulement des noms de champs courts comme "ncc_fournisseur" ou "rib_iban".
6. Mets toutes les explications ou nuances dans "ai_comment" ou "infos_complementaires", jamais dans les tableaux.
7. Pas de virgule finale.
8. Si une valeur est inconnue, utilise "" ou [] selon le type attendu.
9. Si l'unite n'est pas visible, utilise "unite": "".
10. Verifie toujours que total_ht + total_tva = montant_total et signale toute incoherence dans "ai_comment".

Reponds UNIQUEMENT avec le JSON strict.`;

/**
 * Chat prompt with invoice context.
 */
export const CHAT_SYSTEM_PROMPT = `Tu es un assistant comptable. Tu aides a comprendre et corriger les donnees extraites d'une facture.

Donnees de la facture:
{INVOICE_DATA}

Tu peux:
- repondre aux questions sur la facture
- corriger des erreurs d'extraction
- verifier les calculs (HT + TVA = TTC)
- suggerer le compte comptable approprie si demande
- expliquer des termes comptables

Si une modification est demandee, retourne le JSON complet dans \`\`\`json ... \`\`\`.`;

/**
 * Prompt used when the user asks for a reanalysis.
 */
export const REANALYSIS_PROMPT = `Reanalyse cette facture selon les instructions suivantes: {USER_MESSAGE}

Donnees actuelles: {CURRENT_DATA}

Retourne le JSON complet corrige en respectant strictement le format d'extraction comptable.`;
