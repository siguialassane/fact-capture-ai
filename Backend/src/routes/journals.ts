/**
 * Routes API Journaux Comptables
 * 
 * Endpoints pour la gestion des journaux AC, VE, BQ, CA, OD
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  getJournaux,
  getJournalSummary,
  getJournalEntries,
  getNextPieceNumber,
  getSequences,
  getJournalStats,
  validateJournalForEntry,
  correctEntryJournal,
  type JournalCode,
} from "../services/journals";

const journaux = new Hono();

/**
 * GET /journals
 * Liste tous les journaux actifs
 */
journaux.get("/", async (c) => {
  const data = await getJournaux();
  return c.json({
    success: true,
    data,
  });
});

/**
 * GET /journals/stats
 * Statistiques globales des journaux
 */
journaux.get("/stats", async (c) => {
  const stats = await getJournalStats();
  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /journals/summary
 * Résumé par journal et période
 */
journaux.get("/summary", async (c) => {
  const periode = c.req.query("periode"); // Format: "2025-12"
  const data = await getJournalSummary(periode);
  return c.json({
    success: true,
    data,
  });
});

/**
 * GET /journals/sequences
 * Séquences de numérotation
 */
journaux.get("/sequences", async (c) => {
  const exercice = c.req.query("exercice");
  const data = await getSequences(exercice);
  return c.json({
    success: true,
    data,
  });
});

/**
 * GET /journals/:code
 * Détail d'un journal avec ses écritures
 */
journaux.get("/:code", async (c) => {
  const code = c.req.param("code").toUpperCase() as JournalCode;
  const dateDebut = c.req.query("date_debut");
  const dateFin = c.req.query("date_fin");
  const statut = c.req.query("statut") as "brouillon" | "validee" | "cloturee" | undefined;
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : 50;

  const ecritures = await getJournalEntries(code, {
    dateDebut,
    dateFin,
    statut,
    limit,
  });

  return c.json({
    success: true,
    data: {
      journal_code: code,
      ecritures,
      count: ecritures.length,
    },
  });
});

// Schema pour la génération de numéro
const NextPieceSchema = z.object({
  journal_code: z.enum(["AC", "VE", "BQ", "CA", "OD"]),
  date_piece: z.string().optional(), // Format: YYYY-MM-DD
});

/**
 * POST /journals/next-piece
 * Génère le prochain numéro de pièce pour un journal
 */
journaux.post(
  "/next-piece",
  zValidator("json", NextPieceSchema),
  async (c) => {
    const { journal_code, date_piece } = c.req.valid("json");
    const date = date_piece ? new Date(date_piece) : new Date();

    const numero = await getNextPieceNumber(journal_code as JournalCode, date);

    return c.json({
      success: true,
      data: {
        numero_piece: numero,
        journal_code,
        date_piece: date.toISOString().split("T")[0],
      },
    });
  }
);

// Schema pour validation
const ValidateJournalSchema = z.object({
  journal_code: z.enum(["AC", "VE", "BQ", "CA", "OD"]),
  type_operation: z.string(),
  lignes: z.array(
    z.object({
      numero_compte: z.string(),
      debit: z.number(),
      credit: z.number(),
    })
  ),
});

/**
 * POST /journals/validate
 * Valide qu'une écriture utilise le bon journal
 */
journaux.post(
  "/validate",
  zValidator("json", ValidateJournalSchema),
  async (c) => {
    const { journal_code, type_operation, lignes } = c.req.valid("json");

    const result = validateJournalForEntry(
      journal_code as JournalCode,
      type_operation,
      lignes
    );

    return c.json({
      success: result.valid,
      data: result,
    });
  }
);

// Schema pour correction de journal
const CorrectJournalSchema = z.object({
  entry_id: z.string().uuid(),
  new_journal_code: z.enum(["AC", "VE", "BQ", "CA", "OD"]),
  reason: z.string().optional(),
});

/**
 * POST /journals/correct-journal
 * Corrige le journal d'une écriture (déplace vers un autre journal)
 * Met à jour automatiquement les comptes de contrepartie
 */
journaux.post(
  "/correct-journal",
  zValidator("json", CorrectJournalSchema),
  async (c) => {
    const { entry_id, new_journal_code, reason } = c.req.valid("json");

    const result = await correctEntryJournal(
      entry_id,
      new_journal_code as JournalCode,
      reason
    );

    if (!result.success) {
      return c.json({
        success: false,
        error: result.error,
      }, 400);
    }


    return c.json({
      success: true,
      data: result.entry,
      changes: result.changes,
    });
  }
);

// ============== NOUVEAUX ENDPOINTS RÉGÉNÉRATION IA ==============

import {
  regenerateEntryForJournal,
  saveRegeneratedEntry,
  type RegenerateAdditionalInfo,
  type RegeneratedEntry,
} from "../services/journals/regenerate-entry";

// Schema pour régénération d'écriture
const RegenerateEntrySchema = z.object({
  entry_id: z.string().uuid(),
  target_journal: z.enum(["AC", "VE", "BQ", "CA", "OD"]),
  additional_info: z.object({
    new_tiers_name: z.string().optional(),
    new_tiers_type: z.enum(["client", "fournisseur"]),
    payment_mode: z.enum(["especes", "carte_bancaire", "virement", "cheque", "credit"]),
    reason: z.string(),
  }),
});

/**
 * POST /journals/regenerate-entry
 * Régénère une écriture pour un nouveau journal avec DeepSeek
 * Retourne une proposition d'écriture (preview)
 */
journaux.post(
  "/regenerate-entry",
  zValidator("json", RegenerateEntrySchema),
  async (c) => {
    const { entry_id, target_journal, additional_info } = c.req.valid("json");

    console.log(`[Journals API] Régénération demandée: ${entry_id} → ${target_journal}`);

    const result = await regenerateEntryForJournal({
      entry_id,
      target_journal: target_journal as JournalCode,
      additional_info: additional_info as RegenerateAdditionalInfo,
    });

    if (!result.success) {
      return c.json({
        success: false,
        error: result.error,
      }, 400);
    }

    return c.json({
      success: true,
      data: {
        proposed_entry: result.proposed_entry,
        reasoning: result.reasoning,
        changes_summary: result.changes_summary,
      },
    });
  }
);

// Schema pour sauvegarde de l'écriture régénérée
const SaveRegeneratedSchema = z.object({
  old_entry_id: z.string().uuid(),
  new_entry: z.object({
    date_piece: z.string(),
    numero_piece: z.string(),
    journal_code: z.enum(["AC", "VE", "BQ", "CA", "OD"]),
    journal_libelle: z.string(),
    libelle_general: z.string(),
    tiers_code: z.string().optional(),
    tiers_nom: z.string().optional(),
    lignes: z.array(z.object({
      numero_compte: z.string(),
      libelle_compte: z.string(),
      libelle_ligne: z.string(),
      debit: z.number(),
      credit: z.number(),
    })),
    total_debit: z.number(),
    total_credit: z.number(),
    equilibre: z.boolean(),
    commentaires: z.string().optional(),
  }),
});

/**
 * POST /journals/save-regenerated
 * Sauvegarde l'écriture régénérée et supprime l'ancienne
 */
journaux.post(
  "/save-regenerated",
  zValidator("json", SaveRegeneratedSchema),
  async (c) => {
    const { old_entry_id, new_entry } = c.req.valid("json");

    console.log(`[Journals API] Sauvegarde régénération: ${old_entry_id}`);

    const result = await saveRegeneratedEntry(
      old_entry_id,
      new_entry as RegeneratedEntry
    );

    if (!result.success) {
      return c.json({
        success: false,
        error: result.error,
      }, 400);
    }

    return c.json({
      success: true,
      data: {
        new_entry_id: result.newEntryId,
        message: "Écriture régénérée et sauvegardée avec succès",
      },
    });
  }
);

export { journaux };

