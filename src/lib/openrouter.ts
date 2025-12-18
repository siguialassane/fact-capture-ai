const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || "qwen/qwen3-vl-32b-instruct";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Extended AI Result with flexible fields
export interface FlexibleInvoiceAIResult {
  // Validation
  is_invoice: boolean;
  type_document: string; // "facture", "reçu", "devis", "bon de commande", "autre", "non_identifié"
  type_facture?: string; // "électricité", "eau", "téléphone", "achat", "service", "restaurant", etc.

  // Core fields (always present)
  fournisseur: string;
  montant_total: string;
  date_facture: string;
  numero_facture: string;
  tva: string;

  // Totaux globaux (pour le bas du tableau)
  total_ht?: string; // Total Hors Taxe global
  total_tva?: string; // Total TVA global

  // Currency conversion (Ivorian context)
  devise_origine?: string; // "EUR", "USD", "GBP", "CHF", "CNY", "XOF", etc.
  montant_fcfa?: string; // Montant total en FCFA

  // Articles
  articles: {
    designation: string;
    quantite: string;
    unite?: string;
    prix_unitaire: string;
    prix_unitaire_ht?: string;
    taux_tva?: string;
    montant_tva?: string;
    total: string;
  }[];

  // Flexible extra fields (anything else important found)
  extra_fields?: Record<string, string>;

  // AI Commentary
  ai_comment: string;
  anomalies?: string[];
}

const INVOICE_ANALYSIS_PROMPT = `Tu es un EXPERT COMPTABLE spécialiste de la saisie de factures en Côte d'Ivoire.
Ton rôle est d'analyser ce document avec une précision extrême pour l'intégrer dans un logiciel comptable.

CONTEXTE IVOIRIEN:
- Monnaie : XOF (Franc CFA). Taux fixes : 1€=655.957 (arrondi 656), 1$=620.
- TVA standard : 18%.

OBJECTIF:
Extraire structurément toutes les données. Tu dois reconstituer le tableau des articles tel qu'il apparaît, avec les colonnes Unitaires, HT, et TVA si elles existent.
Tu dois aussi identifier clairement les TOTAUX GLOBAUX (Total HT, Total TVA, Net à payer).

SCHEMA JSON ATTENDU (Strict):
{
  "is_invoice": true,
  "type_document": "facture",
  "fournisseur": "Nom complet de l'entreprise",
  "date_facture": "JJ/MM/AAAA",
  "numero_facture": "Réf du document",
  
  "montant_total": "Net à payer TTC (ex: 162,00 €)",
  "total_ht": "Total Hors Taxe global (ex: 135,00 €)",
  "total_tva": "Total TVA global (ex: 27,00 €)",
  "tva": "Idem total_tva",
  
  "devise_origine": "EUR",
  "montant_fcfa": "Valeur convertie si devise étrangère",
  
  "articles": [
    {
      "designation": "Description complète (ne pas tronquer)",
      "quantite": "Qté",
      "unite": "Unit (Kg, L, etc.) ou null",
      "prix_unitaire": "PU TTC affiché",
      "prix_unitaire_ht": "PU HT si dispo",
      "taux_tva": "Taux visible (ex: 20 %)",
      "montant_tva": "Montant tva ligne",
      "total": "Montant ligne (TTC ou HT selon la colonne 'Montant' du doc)"
    }
  ],
  
  "extra_fields": { "Info clé": "Valeur" },
  "ai_comment": "Analyse du comptable: indique si les calculs semblent corrects.",
  "anomalies": ["Incohérence de calcul détectée", "Date manquante"]
}

CONSIGNES:
1. Sois PRÉCIS sur les montants.
2. Si le tableau contient des colonnes "Prix Unitaire HT" ou "TVA", remplis-les impérativement.
3. Ne laisse pas de texte markdown autour du JSON.`;

interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

// Helper to parse AI response content
function parseAIResponse(content: string): FlexibleInvoiceAIResult | null {
  try {
    const parsed = JSON.parse(content);

    // Basic validation for required fields
    if (
      typeof parsed.is_invoice !== "boolean" ||
      typeof parsed.type_document !== "string" ||
      typeof parsed.fournisseur !== "string" ||
      typeof parsed.montant_total !== "string" ||
      typeof parsed.date_facture !== "string" ||
      typeof parsed.numero_facture !== "string" ||
      typeof parsed.tva !== "string" ||
      typeof parsed.ai_comment !== "string"
    ) {
      console.error("AI response missing required fields or has wrong types:", parsed);
      return null;
    }

    return {
      is_invoice: parsed.is_invoice,
      type_document: parsed.type_document,
      type_facture: parsed.type_facture || undefined,
      fournisseur: parsed.fournisseur,
      montant_total: parsed.montant_total,
      date_facture: parsed.date_facture,
      numero_facture: parsed.numero_facture,
      tva: parsed.tva,
      total_ht: parsed.total_ht || undefined,
      total_tva: parsed.total_tva || undefined,
      devise_origine: parsed.devise_origine || undefined,
      montant_fcfa: parsed.montant_fcfa || undefined,
      articles: Array.isArray(parsed.articles)
        ? parsed.articles.map((article: Record<string, unknown>) => ({
          designation: String(article.designation || "Article"),
          quantite: String(article.quantite || "1"),
          unite: article.unite ? String(article.unite) : undefined,
          prix_unitaire: String(article.prix_unitaire || "0,00"),
          prix_unitaire_ht: article.prix_unitaire_ht ? String(article.prix_unitaire_ht) : undefined,
          taux_tva: article.taux_tva ? String(article.taux_tva) : undefined,
          montant_tva: article.montant_tva ? String(article.montant_tva) : undefined,
          total: String(article.total || "0,00"),
        }))
        : [],
      extra_fields: parsed.extra_fields || undefined,
      ai_comment: parsed.ai_comment,
      anomalies: Array.isArray(parsed.anomalies) ? parsed.anomalies.map(String) : undefined,
    };
  } catch (e) {
    console.error("Failed to parse AI response JSON:", e);
    return null;
  }
}

// Compress image for faster analysis
async function compressImage(imageBase64: string, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Resize if too large
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } else {
        resolve(imageBase64); // Fallback to original
      }
    };
    img.onerror = () => resolve(imageBase64); // Fallback to original
    img.src = imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
  });
}

// Analyze image (JPEG, PNG, etc.)
export async function analyzeInvoiceImage(
  imageBase64: string
): Promise<FlexibleInvoiceAIResult | null> {
  if (!OPENROUTER_API_KEY) {
    console.error("OpenRouter API key not configured");
    return null;
  }

  try {
    // Compress image for faster analysis
    const compressedImage = await compressImage(imageBase64);

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Fact Capture AI - Scanner de Factures",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: INVOICE_ANALYSIS_PROMPT,
              },
              {
                type: "image_url",
                image_url: {
                  url: compressedImage,
                },
              },
            ],
          },
        ],
        max_tokens: 3000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return null;
    }

    const data: OpenRouterResponse = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in OpenRouter response");
      return null;
    }

    return parseAIResponse(content);
  } catch (err) {
    console.error("Error analyzing invoice:", err);
    return null;
  }
}

// Convert PDF to image using canvas (first page only)
async function pdfToImage(pdfBase64: string): Promise<string | null> {
  try {
    // Import pdfjs-dist
    const pdfjsLib = await import("pdfjs-dist");

    // Import the worker directly as a URL using Vite's ?url suffix
    // This ensures the worker is bundled and served correctly
    const workerUrl = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default;

    // Extract base64 data
    const base64Data = pdfBase64.split(",")[1] || pdfBase64;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Load PDF with useSystemFonts disabled for better compatibility
    const pdf = await pdfjsLib.getDocument({
      data: bytes,
      useSystemFonts: true,
    }).promise;
    const page = await pdf.getPage(1);

    // Render to canvas at high resolution
    const scale = 2;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Render page to canvas
    await page.render({
      canvasContext: ctx,
      viewport,
      canvas,
    } as Parameters<typeof page.render>[0]).promise;

    // Convert to JPEG
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch (err) {
    console.error("Error converting PDF to image:", err);
    return null;
  }
}

// Analyze PDF file (convert to image first, then analyze)
export async function analyzePDFDocument(
  pdfBase64: string
): Promise<FlexibleInvoiceAIResult | null> {
  if (!OPENROUTER_API_KEY) {
    console.error("OpenRouter API key not configured");
    return null;
  }

  try {
    // Convert PDF first page to image
    const imageBase64 = await pdfToImage(pdfBase64);

    if (!imageBase64) {
      console.error("Failed to convert PDF to image");
      return null;
    }

    // Now analyze as regular image
    return analyzeInvoiceImage(imageBase64);
  } catch (err) {
    console.error("Error analyzing PDF:", err);
    return null;
  }
}

// Alternative: Analyze PDF using a model that supports PDFs directly
export async function analyzePDFDocumentDirect(
  pdfBase64: string
): Promise<FlexibleInvoiceAIResult | null> {
  if (!OPENROUTER_API_KEY) {
    console.error("OpenRouter API key not configured");
    return null;
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Fact Capture AI - Scanner de Factures",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: INVOICE_ANALYSIS_PROMPT,
              },
              {
                type: "image_url",
                image_url: {
                  url: pdfBase64,
                },
              },
            ],
          },
        ],
        max_tokens: 3000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", response.status, errorText);
      return null;
    }

    const data: OpenRouterResponse = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in OpenRouter response");
      return null;
    }

    return parseAIResponse(content);
  } catch (err) {
    console.error("Error analyzing PDF:", err);
    return null;
  }
}



// Check if OpenRouter is configured
export function isOpenRouterConfigured(): boolean {
  return Boolean(OPENROUTER_API_KEY);
}

// Chat conversation context type
export interface ChatContext {
  invoiceData: FlexibleInvoiceAIResult;
  imageBase64: string | null;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
}

// Conversation prompt for contextual chat
const CHAT_SYSTEM_PROMPT = `Tu es un assistant expert en analyse de factures et documents financiers pour le CONTEXTE IVOIRIEN.

CONTEXTE:
Tu as accès aux données d'une facture déjà analysée (fourni dans le contexte JSON).
La monnaie locale est le Franc CFA (XOF).

TAUX DE CHANGE ACTUELS:
- 1 EUR = 656 FCFA
- 1 USD = 620 FCFA
- 1 GBP = 790 FCFA
- 1 CHF = 700 FCFA
- 1 CNY = 85 FCFA

TES CAPACITÉS:
1. Répondre aux questions sur la facture analysée
2. Vérifier des informations (totaux, TVA, cohérence des données)
3. Modifier les données extraites selon les demandes de l'utilisateur
4. Ajouter/supprimer des champs
5. Convertir des devises vers le FCFA en utilisant les taux ci-dessus
6. Signaler des anomalies ou erreurs

RÈGLES IMPORTANTES:
- Reste toujours dans le contexte de la facture
- Si l'utilisateur demande une MODIFICATION des données (ajout/suppression de champs, conversion, etc.),
  génère le nouveau JSON complet avec les modifications demandées, encadré de \`\`\`json ... \`\`\`
- Sois concis et utile dans tes réponses
- Si tu fais une conversion, indique toujours le taux utilisé

FORMAT POUR LES MODIFICATIONS:
Quand l'utilisateur demande de modifier les données, réponds d'abord avec une explication courte,
puis fournis le JSON modifié dans un bloc de code markdown json.`;

// Conversational chat with invoice context (no image by default for speed)
export async function chatWithInvoiceContext(
  userMessage: string,
  context: ChatContext,
  forceReanalyze: boolean = false
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key not configured");
  }

  const messages: { role: string; content: string | object[] }[] = [
    {
      role: "system",
      content: CHAT_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `DONNÉES DE LA FACTURE ACTUELLE:\n\`\`\`json\n${JSON.stringify(context.invoiceData, null, 2)}\n\`\`\``,
    },
    {
      role: "assistant",
      content: "J'ai bien reçu les données de la facture. Je suis prêt à répondre à vos questions ou effectuer des modifications.",
    },
  ];

  // Add conversation history
  for (const msg of context.conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Only send image if forceReanalyze is true (user clicked "Re-analyze" button)
  if (forceReanalyze && context.imageBase64) {
    const compressedImage = await compressImage(context.imageBase64);

    messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: `[Ré-analyse de l'image demandée] ${userMessage}`,
        },
        {
          type: "image_url",
          image_url: {
            url: compressedImage,
          },
        },
      ],
    });
  } else {
    // Normal chat - use JSON data only (fast)
    messages.push({
      role: "user",
      content: userMessage,
    });
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Fact Capture AI - Assistant Facture",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter Chat API error:", response.status, errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data: OpenRouterResponse = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    return content;
  } catch (err) {
    console.error("Error in chat:", err);
    throw err;
  }
}
