import type { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getSupabase } from "../../../lib/supabase";

const compteSchema = z.object({
  numero_compte: z.string().min(1).max(20),
  libelle: z.string().min(1).max(200),
  classe: z.number().int().min(1).max(9),
  type_compte: z.string().optional().nullable(),
  sens_normal: z.enum(["debit", "credit"]),
  est_utilisable: z.boolean().default(true),
});

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

  /**
   * GET /accounting/plan-comptable/all
   * Récupère tous les comptes (incluant les non-utilisables)
   */
  accounting.get("/plan-comptable/all", async (c) => {
    try {
      const { data: comptes, error } = await getSupabase()
        .from("plan_comptable")
        .select("*")
        .order("numero_compte");

      if (error) throw error;

      return c.json({ success: true, data: comptes || [] });
    } catch (error) {
      console.error("[Plan Comptable API] Erreur:", error);
      return c.json({
        success: false,
        error: { code: "FETCH_ERROR", message: "Erreur lors de la récupération" },
      }, 500);
    }
  });

  /**
   * GET /accounting/plan-comptable/:numero
   * Récupère un compte spécifique
   */
  accounting.get("/plan-comptable/:numero", async (c) => {
    try {
      const numero = c.req.param("numero");
      const { data: compte, error } = await getSupabase()
        .from("plan_comptable")
        .select("*")
        .eq("numero_compte", numero)
        .single();

      if (error) throw error;

      return c.json({ success: true, data: compte });
    } catch (error) {
      console.error("[Plan Comptable API] Erreur:", error);
      return c.json({
        success: false,
        error: { code: "NOT_FOUND", message: "Compte introuvable" },
      }, 404);
    }
  });

  /**
   * POST /accounting/plan-comptable
   * Créer un nouveau compte
   */
  accounting.post("/plan-comptable", zValidator("json", compteSchema), async (c) => {
    try {
      const body = c.req.valid("json");
      
      const { data: compte, error } = await getSupabase()
        .from("plan_comptable")
        .insert(body)
        .select()
        .single();

      if (error) throw error;

      return c.json({ success: true, data: compte }, 201);
    } catch (error: any) {
      console.error("[Plan Comptable API] Erreur création:", error);
      return c.json({
        success: false,
        error: { 
          code: error.code === "23505" ? "DUPLICATE_ACCOUNT" : "CREATE_ERROR",
          message: error.code === "23505" ? "Ce numéro de compte existe déjà" : "Erreur lors de la création",
        },
      }, 400);
    }
  });

  /**
   * PUT /accounting/plan-comptable/:numero
   * Mettre à jour un compte
   */
  accounting.put("/plan-comptable/:numero", zValidator("json", compteSchema.partial()), async (c) => {
    try {
      const numero = c.req.param("numero");
      const body = c.req.valid("json");

      const { data: compte, error } = await getSupabase()
        .from("plan_comptable")
        .update(body)
        .eq("numero_compte", numero)
        .select()
        .single();

      if (error) throw error;

      return c.json({ success: true, data: compte });
    } catch (error) {
      console.error("[Plan Comptable API] Erreur mise à jour:", error);
      return c.json({
        success: false,
        error: { code: "UPDATE_ERROR", message: "Erreur lors de la mise à jour" },
      }, 400);
    }
  });

  /**
   * DELETE /accounting/plan-comptable/:numero
   * Supprimer un compte
   */
  accounting.delete("/plan-comptable/:numero", async (c) => {
    try {
      const numero = c.req.param("numero");

      // Vérifier si le compte est utilisé dans des écritures
      const { data: usage, error: usageError } = await getSupabase()
        .from("journal_entry_lines")
        .select("id")
        .eq("compte_numero", numero)
        .limit(1);

      if (usageError) throw usageError;

      if (usage && usage.length > 0) {
        return c.json({
          success: false,
          error: { 
            code: "ACCOUNT_IN_USE", 
            message: "Ce compte est utilisé dans des écritures et ne peut pas être supprimé" 
          },
        }, 400);
      }

      const { error } = await getSupabase()
        .from("plan_comptable")
        .delete()
        .eq("numero_compte", numero);

      if (error) throw error;

      return c.json({ success: true, data: { deleted: true } });
    } catch (error) {
      console.error("[Plan Comptable API] Erreur suppression:", error);
      return c.json({
        success: false,
        error: { code: "DELETE_ERROR", message: "Erreur lors de la suppression" },
      }, 400);
    }
  });
}
