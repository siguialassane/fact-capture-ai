import type { Hono } from "hono";
import { getSupabase } from "../../../lib/supabase";

export function registerPlanComptableRoutes(accounting: Hono) {
  /**
   * GET /accounting/plan-comptable
   * Récupère le plan comptable simplifié pour le frontend
   */
  accounting.get("/plan-comptable", async (c) => {
    try {
      const { data: comptes, error } = await getSupabase()
        .from("plan_comptable")
        .select("numero_compte, libelle, classe, type_compte, sens_normal")
        .eq("est_utilisable", true)
        .order("numero_compte");

      if (error) {
        console.error("[Accounting API] Erreur plan comptable:", error);
        throw error;
      }

      type Compte = { numero_compte: string; libelle: string; classe: number; type_compte: string; sens_normal: string };

      const planComptable = {
        charges: (comptes as Compte[])?.filter((c: Compte) => c.classe === 6) || [],
        produits: (comptes as Compte[])?.filter((c: Compte) => c.classe === 7) || [],
        tiers: (comptes as Compte[])?.filter((c: Compte) => c.classe === 4) || [],
        immobilisations: (comptes as Compte[])?.filter((c: Compte) => c.classe === 2) || [],
        stocks: (comptes as Compte[])?.filter((c: Compte) => c.classe === 3) || [],
        tresorerie: (comptes as Compte[])?.filter((c: Compte) => c.classe === 5) || [],
        capitaux: (comptes as Compte[])?.filter((c: Compte) => c.classe === 1) || [],
        resultats: (comptes as Compte[])?.filter((c: Compte) => c.classe === 8) || [],
      };

      return c.json({
        success: true,
        data: planComptable,
      });
    } catch (error) {
      console.error("[Accounting API] Erreur:", error);
      return c.json({
        success: false,
        error: {
          code: "FETCH_ERROR",
          message: "Erreur lors de la récupération du plan comptable",
        },
      }, 500);
    }
  });
}
