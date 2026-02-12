import { Hono } from "hono";
import { z } from "zod";
import { getSupabase } from "../lib/supabase.js";

export const rapprochementRoutes = new Hono();

function supabase() {
  return getSupabase();
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReleveLine {
  date_operation: string;
  date_valeur?: string;
  libelle: string;
  reference?: string;
  montant: number;
  solde_progressif?: number;
}

// ─── GET /releves — List bank statement lines ────────────────────────────────

rapprochementRoutes.get("/releves", async (c) => {
  try {
    const rapproche = c.req.query("rapproche");
    const dateDebut = c.req.query("date_debut");
    const dateFin = c.req.query("date_fin");

    let query = supabase()
      .from("releves_bancaires")
      .select("*")
      .order("date_operation", { ascending: false });

    if (rapproche === "true") query = query.eq("est_rapproche", true);
    if (rapproche === "false") query = query.eq("est_rapproche", false);
    if (dateDebut) query = query.gte("date_operation", dateDebut);
    if (dateFin) query = query.lte("date_operation", dateFin);

    const { data, error } = await query;
    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ─── POST /releves/import — Import CSV bank statement ────────────────────────

const ImportSchema = z.object({
  lignes: z.array(z.object({
    date_operation: z.string(),
    date_valeur: z.string().optional(),
    libelle: z.string(),
    reference: z.string().optional(),
    montant: z.number(),
    solde_progressif: z.number().optional(),
  })),
  fichier_origine: z.string().optional(),
  compte_banque: z.string().default("5211"),
});

rapprochementRoutes.post("/releves/import", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = ImportSchema.parse(body);

    const rows = parsed.lignes.map((l: ReleveLine) => ({
      date_operation: l.date_operation,
      date_valeur: l.date_valeur || l.date_operation,
      libelle: l.libelle,
      reference: l.reference || null,
      montant: l.montant,
      solde_progressif: l.solde_progressif || null,
      compte_banque: parsed.compte_banque,
      source: "csv",
      fichier_origine: parsed.fichier_origine || null,
      est_rapproche: false,
    }));

    const { data, error } = await supabase()
      .from("releves_bancaires")
      .insert(rows)
      .select();

    if (error) throw error;

    return c.json({
      success: true,
      data: { imported: data?.length || 0, lignes: data },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// ─── DELETE /releves — Clear all unreconciled bank lines ─────────────────────

rapprochementRoutes.delete("/releves", async (c) => {
  try {
    const { error } = await supabase()
      .from("releves_bancaires")
      .delete()
      .eq("est_rapproche", false);

    if (error) throw error;
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ─── GET /ecritures — Bank journal entries (account 5xxx) ────────────────────

rapprochementRoutes.get("/ecritures", async (c) => {
  try {
    const rapproche = c.req.query("rapproche");
    const dateDebut = c.req.query("date_debut");
    const dateFin = c.req.query("date_fin");

    let query = supabase()
      .from("vue_ecritures_banque")
      .select("*")
      .order("date_piece", { ascending: false });

    if (rapproche === "true") query = query.eq("est_rapproche", true);
    if (rapproche === "false") query = query.eq("est_rapproche", false);
    if (dateDebut) query = query.gte("date_piece", dateDebut);
    if (dateFin) query = query.lte("date_piece", dateFin);

    const { data, error } = await query;
    if (error) throw error;

    return c.json({ success: true, data: data || [] });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ─── GET /sessions — List reconciliation sessions ────────────────────────────

rapprochementRoutes.get("/sessions", async (c) => {
  try {
    const { data, error } = await supabase()
      .from("rapprochement_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return c.json({ success: true, data: data || [] });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ─── POST /sessions — Create a new reconciliation session ────────────────────

const SessionSchema = z.object({
  date_debut: z.string(),
  date_fin: z.string(),
  compte_banque: z.string().default("5211"),
  solde_releve_debut: z.number().default(0),
  solde_releve_fin: z.number().default(0),
});

rapprochementRoutes.post("/sessions", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = SessionSchema.parse(body);

    // Compute solde comptable from journal entries
    const { data: ecritures } = await supabase()
      .from("vue_ecritures_banque")
      .select("debit, credit")
      .gte("date_piece", parsed.date_debut)
      .lte("date_piece", parsed.date_fin);

    const soldeComptable = (ecritures || []).reduce(
      (sum: number, e: { debit: number; credit: number }) => sum + (e.credit || 0) - (e.debit || 0),
      0
    );

    const { data, error } = await supabase()
      .from("rapprochement_sessions")
      .insert({
        ...parsed,
        solde_comptable: soldeComptable,
        ecart: parsed.solde_releve_fin - soldeComptable,
      })
      .select()
      .single();

    if (error) throw error;
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// ─── POST /rapprocher — Match a bank line with a journal entry line ──────────

const RapprocherSchema = z.object({
  releve_id: z.string().uuid(),
  entry_line_id: z.string().uuid(),
  session_id: z.string().uuid().optional(),
  montant: z.number(),
  methode: z.enum(["manual", "auto", "suggestion"]).default("manual"),
});

rapprochementRoutes.post("/rapprocher", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = RapprocherSchema.parse(body);

    // Insert the match
    const { data: ligne, error: errLigne } = await supabase()
      .from("rapprochement_lignes")
      .insert({
        session_id: parsed.session_id || null,
        releve_id: parsed.releve_id,
        entry_line_id: parsed.entry_line_id,
        montant: parsed.montant,
        methode: parsed.methode,
      })
      .select()
      .single();

    if (errLigne) throw errLigne;

    // Mark bank line as reconciled
    const { error: errReleve } = await supabase()
      .from("releves_bancaires")
      .update({ est_rapproche: true, rapprochement_id: ligne.id })
      .eq("id", parsed.releve_id);

    if (errReleve) throw errReleve;

    return c.json({ success: true, data: ligne });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 400);
  }
});

// ─── POST /annuler — Un-reconcile a match ────────────────────────────────────

rapprochementRoutes.post("/annuler", async (c) => {
  try {
    const { ligne_id } = await c.req.json();
    if (!ligne_id) return c.json({ success: false, error: "ligne_id requis" }, 400);

    // Get the match to find the releve_id
    const { data: match } = await supabase()
      .from("rapprochement_lignes")
      .select("releve_id")
      .eq("id", ligne_id)
      .single();

    if (match?.releve_id) {
      await supabase()
        .from("releves_bancaires")
        .update({ est_rapproche: false, rapprochement_id: null })
        .eq("id", match.releve_id);
    }

    const { error } = await supabase()
      .from("rapprochement_lignes")
      .delete()
      .eq("id", ligne_id);

    if (error) throw error;
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ─── POST /auto-rapprocher — Auto-match by amount + date proximity ───────────

rapprochementRoutes.post("/auto-rapprocher", async (c) => {
  try {
    const { session_id, tolerance_jours = 5 } = await c.req.json();

    // Get unreconciled bank lines
    const { data: releves } = await supabase()
      .from("releves_bancaires")
      .select("*")
      .eq("est_rapproche", false)
      .order("date_operation");

    // Get unreconciled journal entries
    const { data: ecritures } = await supabase()
      .from("vue_ecritures_banque")
      .select("*")
      .eq("est_rapproche", false);

    if (!releves?.length || !ecritures?.length) {
      return c.json({ success: true, data: { matched: 0, pairs: [] } });
    }

    const pairs: Array<{ releve_id: string; entry_line_id: string; montant: number; confiance: number }> = [];
    const usedEcritures = new Set<string>();

    for (const releve of releves) {
      let bestMatch: any = null;
      let bestScore = 0;

      for (const ecriture of ecritures) {
        if (usedEcritures.has(ecriture.id)) continue;

        // Amount match (exact or close)
        const amountDiff = Math.abs(releve.montant - ecriture.montant_signe);
        if (amountDiff > 0.01) continue; // exact match only for now

        // Date proximity score
        const dateReleve = new Date(releve.date_operation).getTime();
        const dateEcriture = new Date(ecriture.date_piece).getTime();
        const daysDiff = Math.abs(dateReleve - dateEcriture) / (1000 * 60 * 60 * 24);

        if (daysDiff > tolerance_jours) continue;

        const dateScore = 1 - daysDiff / tolerance_jours;
        
        // Reference/libelle bonus
        let refScore = 0;
        const releveLower = releve.libelle?.toLowerCase() || "";
        const ecritureLower = ecriture.libelle?.toLowerCase() || "";
        if (releve.reference && ecriture.numero_piece &&
            releve.reference.includes(ecriture.numero_piece)) {
          refScore = 0.3;
        } else if (releveLower.includes(ecritureLower.substring(0, 10)) ||
                   ecritureLower.includes(releveLower.substring(0, 10))) {
          refScore = 0.1;
        }

        const totalScore = dateScore * 0.7 + refScore + 0.3; // base 0.3 for exact amount
        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestMatch = ecriture;
        }
      }

      if (bestMatch && bestScore >= 0.5) {
        pairs.push({
          releve_id: releve.id,
          entry_line_id: bestMatch.id,
          montant: releve.montant,
          confiance: Math.round(bestScore * 100),
        });
        usedEcritures.add(bestMatch.id);
      }
    }

    // Insert all pairs
    let matched = 0;
    for (const pair of pairs) {
      const { error: errInsert } = await supabase()
        .from("rapprochement_lignes")
        .insert({
          session_id: session_id || null,
          releve_id: pair.releve_id,
          entry_line_id: pair.entry_line_id,
          montant: pair.montant,
          methode: "auto",
          confiance: pair.confiance,
        });

      if (!errInsert) {
        await supabase()
          .from("releves_bancaires")
          .update({ est_rapproche: true })
          .eq("id", pair.releve_id);
        matched++;
      }
    }

    return c.json({
      success: true,
      data: { matched, total_releves: releves.length, pairs },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

// ─── GET /statistiques — Reconciliation stats ────────────────────────────────

rapprochementRoutes.get("/statistiques", async (c) => {
  try {
    const { data: releves } = await supabase()
      .from("releves_bancaires")
      .select("montant, est_rapproche");

    const { data: ecritures } = await supabase()
      .from("vue_ecritures_banque")
      .select("debit, credit, est_rapproche");

    const totalReleves = releves?.length || 0;
    const rapproches = releves?.filter((r: any) => r.est_rapproche).length || 0;
    const nonRapproches = totalReleves - rapproches;

    const totalEcritures = ecritures?.length || 0;
    const ecrituresRappro = ecritures?.filter((e: any) => e.est_rapproche).length || 0;

    const soldeReleve = (releves || []).reduce((s: number, r: any) => s + Number(r.montant), 0);
    const soldeComptable = (ecritures || []).reduce(
      (s: number, e: any) => s + (Number(e.credit) || 0) - (Number(e.debit) || 0),
      0
    );

    return c.json({
      success: true,
      data: {
        releves: { total: totalReleves, rapproches, non_rapproches: nonRapproches },
        ecritures: { total: totalEcritures, rapproches: ecrituresRappro },
        solde_releve: soldeReleve,
        solde_comptable: soldeComptable,
        ecart: soldeReleve - soldeComptable,
        taux_rapprochement: totalReleves > 0 ? Math.round((rapproches / totalReleves) * 100) : 0,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});
