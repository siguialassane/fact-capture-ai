import type { Hono } from "hono";
import { getSupabase } from "../../../lib/supabase";

export function registerDuplicatesRoutes(accounting: Hono) {
  /**
   * GET /accounting/duplicates
   * Récupère les factures potentiellement en double
   */
  accounting.get("/duplicates", async (c) => {
    try {
      const { data: duplicates, error } = await getSupabase()
        .from("invoice_duplicates")
        .select(`
          *,
          invoice:invoice_id (id, ai_result),
          duplicate:duplicate_of (id, ai_result)
        `)
        .eq("resolution", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return c.json({
        success: true,
        data: duplicates,
      });
    } catch (error) {
      console.error("[Accounting API] Erreur:", error);
      return c.json({
        success: false,
        error: {
          code: "FETCH_ERROR",
          message: "Erreur lors de la récupération des doublons",
        },
      }, 500);
    }
  });
}
