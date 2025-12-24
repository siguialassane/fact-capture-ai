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

export { journaux };
