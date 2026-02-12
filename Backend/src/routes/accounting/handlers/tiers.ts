import type { Hono } from "hono";
import { getSupabase } from "../../../lib/supabase";

export function registerTiersRoutes(accounting: Hono) {
  /**
   * GET /accounting/tiers
   * Récupère la liste des tiers (fournisseurs/clients)
   */
  accounting.get("/tiers", async (c) => {
    try {
      const type = c.req.query("type"); // 'fournisseur' ou 'client'

      let query = getSupabase()
        .from("tiers")
        .select("id, code, raison_sociale as nom, type_tiers, compte_comptable as numero_compte_defaut, adresse, ville, pays")
        .eq("est_actif", true)
        .order("raison_sociale");

      if (type) {
        query = query.eq("type_tiers", type);
      }

      const { data: tiers, error } = await query;

      if (error) throw error;

      return c.json({
        success: true,
        data: tiers,
      });
    } catch (error) {
      console.error("[Accounting API] Erreur:", error);
      return c.json({
        success: false,
        error: {
          code: "FETCH_ERROR",
          message: "Erreur lors de la récupération des tiers",
        },
      }, 500);
    }
  });
}
