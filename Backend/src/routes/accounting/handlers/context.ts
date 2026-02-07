import type { Hono } from "hono";
import { getAccountingContext } from "../accounting-context";

export function registerContextRoutes(accounting: Hono) {
  /**
   * GET /accounting/context
   * Récupère le contexte comptable complet pour l'IA
   */
  accounting.get("/context", async (c) => {
    try {
      const context = await getAccountingContext();
      return c.json({
        success: true,
        data: context,
      });
    } catch (error) {
      console.error("[Accounting API] Erreur:", error);
      return c.json({
        success: false,
        error: {
          code: "FETCH_ERROR",
          message: "Erreur lors de la récupération du contexte",
        },
      }, 500);
    }
  });
}
