import { zValidator } from "@hono/zod-validator";
import { generateAccountingEntry, type AccountingResult } from "../../../services/accounting";
import { getAccountingContext } from "../accounting-context";
import { GenerateEntrySchema } from "../schemas";
import type { Hono } from "hono";

export function registerGenerateRoutes(accounting: Hono) {
  /**
   * POST /accounting/generate
   * Génère une écriture comptable à partir des données de facture
   */
  accounting.post(
    "/generate",
    zValidator("json", GenerateEntrySchema),
    async (c) => {
      const { invoiceData, invoiceId, statutPaiement, montantPartiel, model } = c.req.valid("json");

      console.log(`[Accounting API] Génération d'écriture comptable avec ${model || 'modèle par défaut'}...`);

      try {
        const accountingContext = await getAccountingContext();

        const result: AccountingResult = await generateAccountingEntry(
          invoiceData as any,
          accountingContext,
          {
            statutPaiement,
            montantPartiel,
            model: model as any,
          }
        );

        if (!result.success) {
          return c.json({
            success: false,
            error: {
              code: "GENERATION_FAILED",
              message: "Échec de la génération de l'écriture comptable",
              details: result.erreurs,
            },
          }, 500);
        }

        return c.json({
          success: true,
          data: {
            ecriture: result.ecriture,
            reasoning: result.reasoning_details,
            suggestions: result.suggestions,
            invoiceId,
          },
        });
      } catch (error) {
        console.error("[Accounting API] Erreur:", error);
        return c.json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Erreur interne lors de la génération",
            details: error instanceof Error ? error.message : String(error),
          },
        }, 500);
      }
    }
  );
}
