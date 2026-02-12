import { zValidator } from "@hono/zod-validator";
import { refineAccountingEntry, type AccountingResult } from "../../../services/accounting";
import { RefineEntrySchema } from "../schemas";
import type { Hono } from "hono";

export function registerRefineRoutes(accounting: Hono) {
  /**
   * POST /accounting/refine
   * Affine une écriture comptable avec feedback utilisateur
   */
  accounting.post(
    "/refine",
    zValidator("json", RefineEntrySchema),
    async (c) => {
      const { previousEntry, userFeedback, originalInvoiceData, model } = c.req.valid("json");

      console.log(`[Accounting API] Raffinement d'écriture comptable avec ${model || 'modèle par défaut'}...`);

      try {
        const result = await refineAccountingEntry(
          previousEntry as any,
          userFeedback,
          originalInvoiceData as any,
          model as any
        );

        if (!result.success) {
          return c.json({
            success: false,
            error: {
              code: "REFINEMENT_FAILED",
              message: "Échec de l'affinement de l'écriture comptable",
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
          },
        });
      } catch (error) {
        console.error("[Accounting API] Erreur:", error);
        return c.json({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Erreur interne lors de l'affinement",
            details: error instanceof Error ? error.message : String(error),
          },
        }, 500);
      }
    }
  );
}
