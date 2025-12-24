/**
 * Routes API Audit Comptable
 * 
 * Endpoints pour l'audit des états financiers et écritures
 */

import { Hono } from "hono";
import {
  auditEtatsFinanciers,
  auditEcriture,
  auditRapide,
} from "../services/audit";

const audit = new Hono();

/**
 * GET /audit/etats-financiers
 * Audit complet des états financiers avec Gemini
 */
audit.get("/etats-financiers", async (c) => {
  const exercice = c.req.query("exercice") || new Date().getFullYear().toString();

  try {
    console.log(`[API Audit] Audit états financiers ${exercice}`);
    const result = await auditEtatsFinanciers(exercice);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[API Audit] Erreur:", error);
    return c.json(
      {
        success: false,
        error: "Erreur lors de l'audit",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      500
    );
  }
});

/**
 * GET /audit/rapide
 * Audit rapide sans IA (vérifications locales)
 */
audit.get("/rapide", async (c) => {
  const exercice = c.req.query("exercice") || new Date().getFullYear().toString();

  try {
    const result = await auditRapide(exercice);
    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[API Audit Rapide] Erreur:", error);
    return c.json(
      {
        success: false,
        error: "Erreur lors de l'audit rapide",
      },
      500
    );
  }
});

/**
 * POST /audit/ecriture
 * Audit d'une écriture comptable spécifique
 */
audit.post("/ecriture", async (c) => {
  try {
    const body = await c.req.json();
    const { facture, ecriture } = body;

    if (!facture || !ecriture) {
      return c.json(
        {
          success: false,
          error: "Facture et écriture requises",
        },
        400
      );
    }

    const result = await auditEcriture(facture, ecriture);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[API Audit Écriture] Erreur:", error);
    return c.json(
      {
        success: false,
        error: "Erreur lors de l'audit de l'écriture",
      },
      500
    );
  }
});

export { audit };
