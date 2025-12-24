/**
 * Routes API États Financiers
 * 
 * Endpoints pour le Bilan, Compte de Résultat et Indicateurs SYSCOHADA
 */

import { Hono } from "hono";
import {
  getBilan,
  getCompteResultat,
  getIndicateursFinanciers,
} from "../services/etats-financiers";

const etatsFinanciers = new Hono();

/**
 * GET /etats-financiers/bilan
 * Bilan comptable (Actif / Passif)
 */
etatsFinanciers.get("/bilan", async (c) => {
  const exercice = c.req.query("exercice") || new Date().getFullYear().toString();

  try {
    const data = await getBilan(exercice);
    return c.json(data);
  } catch (error) {
    console.error("[API États Financiers] Erreur bilan:", error);
    return c.json(
      {
        error: "Erreur lors de la récupération du bilan",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      500
    );
  }
});

/**
 * GET /etats-financiers/resultat
 * Compte de résultat (Charges / Produits)
 */
etatsFinanciers.get("/resultat", async (c) => {
  const exercice = c.req.query("exercice") || new Date().getFullYear().toString();

  try {
    const data = await getCompteResultat(exercice);
    return c.json(data);
  } catch (error) {
    console.error("[API États Financiers] Erreur résultat:", error);
    return c.json(
      {
        error: "Erreur lors de la récupération du compte de résultat",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      500
    );
  }
});

/**
 * GET /etats-financiers/indicateurs
 * Indicateurs financiers (ratios)
 */
etatsFinanciers.get("/indicateurs", async (c) => {
  const exercice = c.req.query("exercice") || new Date().getFullYear().toString();

  try {
    const data = await getIndicateursFinanciers(exercice);
    return c.json(data);
  } catch (error) {
    console.error("[API États Financiers] Erreur indicateurs:", error);
    return c.json(
      {
        error: "Erreur lors de la récupération des indicateurs",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      500
    );
  }
});

export { etatsFinanciers };
