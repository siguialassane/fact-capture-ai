import type { Hono } from "hono";
import { getSupabase } from "../../../lib/supabase";

export function registerEntriesRoutes(accounting: Hono) {
  /**
   * GET /accounting/entries
   * Liste les écritures comptables
   * Query params: ?invoice_id=X pour filtrer par facture
   */
  accounting.get("/entries", async (c) => {
    try {
      const invoiceId = c.req.query("invoice_id");

      let query = getSupabase()
        .from("journal_entries")
        .select(`
          *,
          lignes:journal_entry_lines (
            compte_numero,
            libelle_ligne:libelle,
            debit,
            credit
          )
        `)
        .order("date_piece", { ascending: false });

      if (invoiceId) {
        query = query.eq("invoice_id", parseInt(invoiceId));
      } else {
        query = query.limit(50);
      }

      const { data: entries, error } = await query;

      if (error) throw error;

      return c.json({
        success: true,
        data: entries,
      });
    } catch (error) {
      console.error("[Accounting API] Erreur:", error);
      return c.json({
        success: false,
        error: {
          code: "FETCH_ERROR",
          message: "Erreur lors de la récupération des écritures",
        },
      }, 500);
    }
  });
}
