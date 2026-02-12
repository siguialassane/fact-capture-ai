import type { Hono } from "hono";
import { getSupabase } from "../../../lib/supabase";

export function registerValidateEntryRoutes(accounting: Hono) {
  /**
   * POST /accounting/entries/:id/validate
  * Valide une écriture comptable (passe du statut "brouillon" à "validee")
   */
  accounting.post("/entries/:id/validate", async (c) => {
    try {
      const entryId = c.req.param("id");

      console.log(`[Accounting API] Validation de l'écriture ${entryId}...`);

      const { data: entry, error: fetchError } = await getSupabase()
        .from("journal_entries")
        .select("*")
        .eq("id", entryId)
        .single();

      if (fetchError || !entry) {
        return c.json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Écriture comptable introuvable",
          },
        }, 404);
      }

      if (entry.statut !== "brouillon") {
        return c.json({
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: `Cette écriture est déjà au statut "${entry.statut}"`,
          },
        }, 400);
      }

      const { data: updatedEntry, error: updateError } = await getSupabase()
        .from("journal_entries")
        .update({
          statut: "validee",
          validated_at: new Date().toISOString(),
        })
        .eq("id", entryId)
        .select()
        .single();

      if (updateError) {
        console.error("[Accounting API] Erreur validation:", updateError);
        throw updateError;
      }

      await getSupabase().from("control_audit_log").insert({
        control_type: "entry_validated",
        entity_type: "journal_entry",
        entity_id: entryId,
        status: "passed",
        message: `Écriture ${entry.numero_piece} validée avec succès`,
        details: {
          previous_status: "brouillon",
          new_status: "validee",
        },
        executed_by: "user",
      });

      console.log(`[Accounting API] Écriture ${entryId} validée avec succès`);

      return c.json({
        success: true,
        data: {
          entry: updatedEntry,
          message: "Écriture validée avec succès",
        },
      });
    } catch (error) {
      console.error("[Accounting API] Erreur validation:", error);
      return c.json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Erreur lors de la validation de l'écriture",
          details: error instanceof Error ? error.message : String(error),
        },
      }, 500);
    }
  });
}
