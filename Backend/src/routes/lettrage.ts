/**
 * Routes API Lettrage
 * 
 * Endpoints pour le rapprochement factures/règlements
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  getLignesALettrer,
  effectuerLettrage,
  annulerLettrage,
  getGroupesLettrage,
  proposerLettrages,
  getHistoriqueLettrage,
  getStatistiquesLettrage,
} from "../services/lettrage";

const lettrage = new Hono();

/**
 * GET /lettrage/lignes
 * Lignes disponibles pour le lettrage
 */
lettrage.get("/lignes", async (c) => {
  const compteDebut = c.req.query("compte_debut");
  const compteFin = c.req.query("compte_fin");
  const tiersCode = c.req.query("tiers_code");
  const dateDebut = c.req.query("date_debut");
  const dateFin = c.req.query("date_fin");
  const statut = c.req.query("statut") as "non_lettre" | "partiellement_lettre" | "lettre" | undefined;
  const journalCode = c.req.query("journal_code");

  const data = await getLignesALettrer({
    compte_debut: compteDebut,
    compte_fin: compteFin,
    tiers_code: tiersCode,
    date_debut: dateDebut,
    date_fin: dateFin,
    statut,
    journal_code: journalCode,
  });

  return c.json({
    success: true,
    data,
    count: data.length,
  });
});

/**
 * GET /lettrage/groupes
 * Groupes de lettrage existants
 */
lettrage.get("/groupes", async (c) => {
  const compte = c.req.query("compte");
  const data = await getGroupesLettrage(compte);

  return c.json({
    success: true,
    data,
    count: data.length,
  });
});

/**
 * GET /lettrage/propositions/:compte
 * Propositions de lettrage automatique pour un compte
 */
lettrage.get("/propositions/:compte", async (c) => {
  const compte = c.req.param("compte");
  const tiersCode = c.req.query("tiers_code");

  const data = await proposerLettrages(compte, tiersCode);

  return c.json({
    success: true,
    data,
    count: data.length,
  });
});

/**
 * GET /lettrage/statistiques/:compte
 * Statistiques de lettrage pour un compte
 */
lettrage.get("/statistiques/:compte", async (c) => {
  const compte = c.req.param("compte");
  const data = await getStatistiquesLettrage(compte);

  return c.json({
    success: true,
    data,
  });
});

/**
 * GET /lettrage/historique
 * Historique des opérations de lettrage
 */
lettrage.get("/historique", async (c) => {
  const compte = c.req.query("compte");
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : 50;

  const data = await getHistoriqueLettrage(compte, limit);

  return c.json({
    success: true,
    data,
    count: data.length,
  });
});

// Schema pour effectuer un lettrage
const EffectuerLettrageSchema = z.object({
  ligne_ids: z.array(z.number()).min(2, "Il faut au moins 2 lignes pour lettrer"),
  compte: z.string(),
  tiers_code: z.string().optional(),
  user: z.string().optional(),
});

/**
 * POST /lettrage/effectuer
 * Effectue le lettrage d'un groupe de lignes
 */
lettrage.post(
  "/effectuer",
  zValidator("json", EffectuerLettrageSchema),
  async (c) => {
    const { ligne_ids, compte, tiers_code, user } = c.req.valid("json");

    const result = await effectuerLettrage(ligne_ids, compte, tiers_code, user);

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: {
            code: "LETTRAGE_FAILED",
            message: result.error || "Impossible de lettrer ces lignes",
            ecart: result.ecart,
          },
        },
        400
      );
    }

    return c.json({
      success: true,
      data: {
        lettre: result.lettre,
        lignes_lettrees: result.lignes_lettrees,
      },
    });
  }
);

// Schema pour annuler un lettrage
const AnnulerLettrageSchema = z.object({
  lettre: z.string(),
  compte: z.string(),
  user: z.string().optional(),
});

/**
 * POST /lettrage/annuler
 * Annule le lettrage d'un groupe
 */
lettrage.post(
  "/annuler",
  zValidator("json", AnnulerLettrageSchema),
  async (c) => {
    const { lettre, compte, user } = c.req.valid("json");

    const success = await annulerLettrage(lettre, compte, user);

    if (!success) {
      return c.json(
        {
          success: false,
          error: {
            code: "DELETTRAGE_FAILED",
            message: "Impossible d'annuler le lettrage",
          },
        },
        400
      );
    }

    return c.json({
      success: true,
      data: {
        lettre,
        compte,
        action: "delettrage",
      },
    });
  }
);

// Schema pour lettrage automatique
const AutoLettrageSchema = z.object({
  compte: z.string(),
  tiers_code: z.string().optional(),
  confiance_min: z.number().min(0).max(100).optional().default(90),
  user: z.string().optional(),
});

/**
 * POST /lettrage/auto
 * Effectue les lettrages automatiques pour les propositions avec haute confiance
 */
lettrage.post(
  "/auto",
  zValidator("json", AutoLettrageSchema),
  async (c) => {
    const { compte, tiers_code, confiance_min, user } = c.req.valid("json");

    // Récupérer les propositions
    const propositions = await proposerLettrages(compte, tiers_code);

    // Filtrer par confiance
    const propositionsValides = propositions.filter((p) => p.confiance >= confiance_min);

    const resultats = [];

    for (const prop of propositionsValides) {
      const ligneIds = [
        ...prop.lignes_debit.map((l) => l.id),
        ...prop.lignes_credit.map((l) => l.id),
      ];

      const result = await effectuerLettrage(ligneIds, compte, tiers_code, user);

      resultats.push({
        proposition: prop,
        result,
      });
    }

    const reussis = resultats.filter((r) => r.result.success);
    const echoues = resultats.filter((r) => !r.result.success);

    return c.json({
      success: true,
      data: {
        nb_propositions: propositionsValides.length,
        nb_lettres: reussis.length,
        nb_echecs: echoues.length,
        details: resultats,
      },
    });
  }
);

export { lettrage };
