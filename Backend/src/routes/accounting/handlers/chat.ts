import { zValidator } from "@hono/zod-validator";
import type { Hono } from "hono";
import { ChatSchema } from "../schemas";

export function registerChatRoutes(accounting: Hono) {
  /**
   * POST /accounting/chat
   * Chat avec Gemini à propos d'une écriture comptable
   */
  accounting.post(
    "/chat",
    zValidator("json", ChatSchema),
    async (c) => {
      const { message, entry } = c.req.valid("json");

      console.log("[Accounting Chat] Question:", message);

      try {
        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
        const ACCOUNTING_MODEL = process.env.GEMINI_MODEL || "deepseek/deepseek-v3.2";

        if (!OPENROUTER_API_KEY) {
          return c.json({
            success: false,
            error: { code: "CONFIG_ERROR", message: "API non configurée" },
          }, 500);
        }

        const entryContext = `
## ÉCRITURE COMPTABLE EN COURS

Date : ${entry.date_piece}
N° Pièce : ${entry.numero_piece}
Journal : ${entry.journal_code} - ${entry.journal_libelle || ""}
Tiers : ${entry.tiers_nom || "Non identifié"}
Libellé : ${entry.libelle_general}

### LIGNES DE L'ÉCRITURE :
${entry.lignes.map(l => `- ${l.numero_compte} | ${l.libelle_compte || l.libelle_ligne} | Débit: ${l.debit} | Crédit: ${l.credit}`).join('\n')}

TOTAL DÉBIT : ${entry.total_debit}
TOTAL CRÉDIT : ${entry.total_credit}
ÉQUILIBRÉE : ${entry.equilibre ? 'Oui' : 'Non'}
`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: ACCOUNTING_MODEL,
            messages: [
              {
                role: "system",
                content: `Tu es un expert-comptable spécialisé en SYSCOHADA (comptabilité africaine).
Tu aides l'utilisateur à comprendre une écriture comptable générée automatiquement.
Réponds de manière claire, concise et pédagogique en français.
Si on te demande de modifier l'écriture, explique ce qu'il faudrait changer.

${entryContext}`,
              },
              {
                role: "user",
                content: message,
              },
            ],
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("[Accounting Chat] Erreur API:", errorText);
          return c.json({
            success: false,
            error: { code: "API_ERROR", message: "Erreur de communication avec l'IA" },
          }, 500);
        }

        const result = await response.json() as {
          choices?: Array<{ message?: { content?: string } }>;
        };

        const reply = result.choices?.[0]?.message?.content || "Je n'ai pas pu générer de réponse.";

        return c.json({
          success: true,
          data: { reply },
        });
      } catch (error) {
        console.error("[Accounting Chat] Erreur:", error);
        return c.json({
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Erreur interne" },
        }, 500);
      }
    }
  );
}
