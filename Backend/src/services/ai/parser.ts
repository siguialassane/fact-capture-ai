import type { InvoiceAIResult } from "./types";

function extractJsonCandidate(response: string): string | null {
  const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const startIndex = response.indexOf("{");
  if (startIndex === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < response.length; index++) {
    const char = response[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return response.slice(startIndex, index + 1);
      }
    }
  }

  return response.slice(startIndex).trim();
}

function stripParentheticalNotesAfterQuotedStrings(input: string): string {
  let result = "";
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (char !== "\"") {
      result += char;
      index += 1;
      continue;
    }

    result += char;
    index += 1;

    let escaped = false;
    while (index < input.length) {
      const current = input[index];
      result += current;
      index += 1;

      if (escaped) {
        escaped = false;
        continue;
      }

      if (current === "\\") {
        escaped = true;
        continue;
      }

      if (current === "\"") {
        break;
      }
    }

    let lookahead = index;
    while (lookahead < input.length && /\s/.test(input[lookahead])) {
      lookahead += 1;
    }

    if (input[lookahead] !== "(") {
      continue;
    }

    index = lookahead;
    let depth = 0;

    while (index < input.length) {
      const current = input[index];
      if (current === "(") {
        depth += 1;
      } else if (current === ")") {
        depth -= 1;
        if (depth === 0) {
          index += 1;
          break;
        }
      }
      index += 1;
    }

    while (index < input.length && /\s/.test(input[index])) {
      index += 1;
    }
  }

  return result;
}

function repairCommonJsonIssues(candidate: string): string {
  return stripParentheticalNotesAfterQuotedStrings(candidate)
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function sanitizeParsedInvoiceData(data: unknown): InvoiceAIResult | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const invoice = { ...(data as Record<string, unknown>) };

  if (Array.isArray(invoice.articles)) {
    invoice.articles = invoice.articles.map((article) => {
      if (!article || typeof article !== "object" || Array.isArray(article)) {
        return article;
      }

      const normalizedArticle = { ...(article as Record<string, unknown>) };
      if (normalizedArticle.total === undefined && normalizedArticle.montant_ttc !== undefined) {
        normalizedArticle.total = normalizedArticle.montant_ttc;
      }
      return normalizedArticle;
    });
  }

  if (Array.isArray(invoice.donnees_manquantes)) {
    invoice.donnees_manquantes = invoice.donnees_manquantes
      .map((item) => (typeof item === "string" ? item.trim() : String(item).trim()))
      .filter((item) => item.length > 0);
  }

  return invoice as InvoiceAIResult;
}

function tryParseJson(candidate: string): InvoiceAIResult | null {
  try {
    return sanitizeParsedInvoiceData(JSON.parse(candidate));
  } catch {
    return null;
  }
}

/**
 * Parse AI response and recover a valid JSON payload when the model adds small formatting mistakes.
 */
export function parseAIResponse(response: string): InvoiceAIResult | null {
  const candidate = extractJsonCandidate(response) ?? response.trim();
  const repairedCandidate = repairCommonJsonIssues(candidate);

  const parsed =
    tryParseJson(candidate) ??
    tryParseJson(repairedCandidate) ??
    tryParseJson(repairCommonJsonIssues(response));

  if (parsed) {
    return parsed;
  }

  console.error("Failed to parse AI response");
  console.debug("Raw response:", response);
  return null;
}

/**
 * Extract modified data from chat response.
 */
export function extractModifiedDataFromChat(response: string): InvoiceAIResult | null {
  const candidate = extractJsonCandidate(response);
  if (!candidate) {
    return null;
  }

  return tryParseJson(candidate) ?? tryParseJson(repairCommonJsonIssues(candidate));
}

/**
 * Clean chat response for display.
 * Removes JSON blocks that were used for data updates.
 */
export function cleanChatResponse(response: string): string {
  let cleaned = response.replace(
    /```json\s*\{[\s\S]*?"(?:is_invoice|fournisseur|articles)"[\s\S]*?\}[\s\S]*?```/g,
    ""
  );

  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

  if (!cleaned || cleaned.length < 10) {
    return "Les donnees ont ete mises a jour selon vos instructions.";
  }

  return cleaned;
}

/**
 * Validate invoice data structure.
 */
export function validateInvoiceData(data: unknown): data is InvoiceAIResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  if ("is_invoice" in obj && typeof obj.is_invoice !== "boolean") {
    return false;
  }

  if ("articles" in obj && !Array.isArray(obj.articles)) {
    return false;
  }

  if ("donnees_manquantes" in obj && !Array.isArray(obj.donnees_manquantes)) {
    return false;
  }

  return true;
}

/**
 * Normalize invoice data with defaults while preserving useful OCR metadata.
 */
export function normalizeInvoiceData(data: Partial<InvoiceAIResult>): InvoiceAIResult {
  const infosComplementaires = (data as InvoiceAIResult).infos_complementaires;
  const extraFields = data.extra_fields ?? infosComplementaires;

  return {
    is_invoice: data.is_invoice ?? true,
    type_document: data.type_document ?? "",
    type_facture: data.type_facture,

    // Fournisseur
    fournisseur: data.fournisseur ?? "",
    adresse_fournisseur: data.adresse_fournisseur,
    telephone_fournisseur: data.telephone_fournisseur,
    email_fournisseur: data.email_fournisseur,
    rccm_fournisseur: data.rccm_fournisseur,
    ncc_fournisseur: data.ncc_fournisseur,
    siret_fournisseur: data.siret_fournisseur,
    tva_intracom: data.tva_intracom,

    // Client
    client: data.client,
    adresse_client: data.adresse_client,
    numero_client: data.numero_client,

    // References
    numero_facture: data.numero_facture ?? "",
    date_facture: data.date_facture ?? "",
    date_echeance: data.date_echeance,
    numero_commande: data.numero_commande,

    // Articles
    articles:
      data.articles?.map((article) => ({
        ...article,
        total: article.total ?? article.montant_ttc,
      })) ?? [],

    // Detailed amounts
    sous_total_ht: data.sous_total_ht,
    remise: data.remise,
    remise_montant: data.remise_montant,
    frais_port: data.frais_port,
    total_ht: data.total_ht,
    tva_details: (data as InvoiceAIResult).tva_details,
    total_tva: data.total_tva,
    tva: data.tva ?? "",
    montant_total: data.montant_total ?? "",

    // Currencies
    devise: data.devise,
    devise_origine: data.devise_origine,
    montant_fcfa: data.montant_fcfa,

    // Payments
    acompte: data.acompte,
    montant_paye: data.montant_paye,
    reste_a_payer: data.reste_a_payer,
    mode_paiement: data.mode_paiement,
    conditions_paiement: data.conditions_paiement,
    rib_iban: data.rib_iban,

    // Misc
    notes: data.notes,
    ai_comment: data.ai_comment ?? "",
    anomalies: data.anomalies,
    donnees_manquantes: (data as InvoiceAIResult).donnees_manquantes,
    infos_complementaires: infosComplementaires,
    extra_fields: extraFields,
  };
}
