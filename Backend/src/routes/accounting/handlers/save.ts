import { zValidator } from "@hono/zod-validator";
import type { Hono } from "hono";
import { getSupabase } from "../../../lib/supabase";
import { SaveEntrySchema } from "../schemas";

export function registerSaveRoutes(accounting: Hono) {
  /**
   * POST /accounting/save
   * Sauvegarde une écriture comptable dans la base de données
   */
  const ensureFiscalYear = async (exerciceCode: string) => {
    const { data: existing } = await getSupabase()
      .from("fiscal_years")
      .select("id")
      .eq("code", exerciceCode)
      .single();

    if (existing?.id) {
      return;
    }

    const year = parseInt(exerciceCode, 10);
    const date_debut = new Date(year, 0, 1).toISOString().split("T")[0];
    const date_fin = new Date(year, 11, 31).toISOString().split("T")[0];

    const { error } = await getSupabase()
      .from("fiscal_years")
      .insert({
        code: exerciceCode,
        libelle: `Exercice ${exerciceCode}`,
        date_debut,
        date_fin,
        statut: "ouvert",
        est_courant: true,
      });

    if (error) {
      console.error("[Accounting API] Erreur création exercice:", error);
      throw error;
    }

    console.log(`[Accounting API] Exercice ${exerciceCode} créé automatiquement`);
  };

  accounting.post(
    "/save",
    zValidator("json", SaveEntrySchema),
    async (c) => {
      const { ecriture, invoiceId, iaModel, iaReasoning, iaSuggestions } = c.req.valid("json");

      console.log("[Accounting API] Sauvegarde de l'écriture comptable...");

      try {
        if (!ecriture.equilibre) {
          return c.json({
            success: false,
            error: {
              code: "UNBALANCED_ENTRY",
              message: "L'écriture n'est pas équilibrée. Débit ≠ Crédit",
              details: {
                total_debit: ecriture.total_debit,
                total_credit: ecriture.total_credit,
              },
            },
          }, 400);
        }

        let tiersId = null;
        if (ecriture.tiers_code || ecriture.tiers_nom) {
          const { data: tiers } = await getSupabase()
            .from("tiers")
            .select("id")
            .or(`code.eq.${ecriture.tiers_code},raison_sociale.ilike.%${ecriture.tiers_nom}%`)
            .limit(1)
            .single();
          tiersId = tiers?.id;
        }

        const datePiece = new Date(ecriture.date_piece);
        const exerciceCode = datePiece.getFullYear().toString();

        await ensureFiscalYear(exerciceCode);

        const { data: entry, error: entryError } = await getSupabase()
          .from("journal_entries")
          .insert({
            numero_piece: ecriture.numero_piece,
            date_piece: ecriture.date_piece,
            date_comptable: new Date().toISOString().split('T')[0],
            journal_code: ecriture.journal_code,
            exercice_code: exerciceCode,
            libelle: ecriture.libelle_general,
            invoice_id: invoiceId || null,
            tiers_id: tiersId,
            tiers_code: ecriture.tiers_code,
            tiers_nom: ecriture.tiers_nom,
            montant_total: ecriture.total_debit,
            total_debit: ecriture.total_debit,
            total_credit: ecriture.total_credit,
            statut: "valide",
            validated_at: new Date().toISOString(),
            genere_par_ia: true,
            ia_model: iaModel || "deepseek/deepseek-v3.2",
            ia_reasoning: iaReasoning || ecriture.reasoning,
            ia_suggestions: iaSuggestions ? JSON.stringify(iaSuggestions) : null,
            notes: ecriture.commentaires,
          })
          .select()
          .single();

        if (entryError) {
          console.error("[Accounting API] Erreur insertion écriture:", entryError);
          throw entryError;
        }

        const lignesData = ecriture.lignes.map((ligne, index) => ({
          entry_id: entry.id,
          compte_numero: ligne.numero_compte,
          libelle_compte: ligne.libelle_compte,
          libelle: ligne.libelle_ligne,
          debit: ligne.debit,
          credit: ligne.credit,
          tiers_code: ligne.tiers_code,
          numero_ligne: index + 1,
          ligne_ordre: index + 1,
        }));

        const { error: lignesError } = await getSupabase()
          .from("journal_entry_lines")
          .insert(lignesData);

        if (lignesError) {
          console.error("[Accounting API] Erreur insertion lignes:", lignesError);
          await getSupabase().from("journal_entries").delete().eq("id", entry.id);
          throw lignesError;
        }

        await getSupabase().from("control_audit_log").insert({
          control_type: "entry_saved",
          entity_type: "journal_entry",
          entity_id: entry.id,
          status: "passed",
          message: `Écriture ${ecriture.numero_piece} sauvegardée avec succès`,
          details: {
            lignes_count: ecriture.lignes.length,
            total: ecriture.total_debit,
            genere_par_ia: true,
          },
          executed_by: "user",
        });

        console.log("[Accounting API] Écriture sauvegardée:", entry.id);

        return c.json({
          success: true,
          data: {
            entryId: entry.id,
            message: "Écriture comptable sauvegardée avec succès",
          },
        });
      } catch (error) {
        console.error("[Accounting API] Erreur sauvegarde:", error);
        return c.json({
          success: false,
          error: {
            code: "SAVE_ERROR",
            message: "Erreur lors de la sauvegarde de l'écriture",
            details: error instanceof Error ? error.message : String(error),
          },
        }, 500);
      }
    }
  );
}
