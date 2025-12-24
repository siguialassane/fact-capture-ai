/**
 * Routes API Grand Livre
 * 
 * Endpoints pour consultation du grand livre et balance
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  getGrandLivreCompte,
  searchGrandLivre,
  getComptesWithSoldes,
  getBalance,
  getSoldeCompteAtDate,
  searchComptes,
} from "../services/grand-livre";

const grandLivre = new Hono();

/**
 * GET /grand-livre/comptes
 * Liste des comptes avec leurs soldes
 */
grandLivre.get("/comptes", async (c) => {
  const classeDebut = c.req.query("classe_debut");
  const classeFin = c.req.query("classe_fin");
  const avecMouvements = c.req.query("avec_mouvements") === "true";

  const data = await getComptesWithSoldes({
    classeDebut,
    classeFin,
    avecMouvements,
  });

  return c.json({
    success: true,
    data,
    count: data.length,
  });
});

/**
 * GET /grand-livre/search-comptes
 * Recherche de comptes par numéro ou libellé
 */
grandLivre.get("/search-comptes", async (c) => {
  const query = c.req.query("q") || "";
  const limit = c.req.query("limit") ? parseInt(c.req.query("limit")!) : 20;

  const data = await searchComptes(query, limit);

  return c.json({
    success: true,
    data,
  });
});

/**
 * GET /grand-livre/balance
 * Balance des comptes
 */
grandLivre.get("/balance", async (c) => {
  const dateArrete = c.req.query("date_arrete");
  const classeDebut = c.req.query("classe_debut");
  const classeFin = c.req.query("classe_fin");

  const data = await getBalance({
    dateArrete,
    classeDebut,
    classeFin,
  });

  return c.json({
    success: true,
    data,
  });
});

/**
 * GET /grand-livre/compte/:numero
 * Grand livre d'un compte spécifique
 */
grandLivre.get("/compte/:numero", async (c) => {
  const numeroCompte = c.req.param("numero");
  const dateDebut = c.req.query("date_debut");
  const dateFin = c.req.query("date_fin");
  const inclureLettres = c.req.query("inclure_lettres") === "true";

  const data = await getGrandLivreCompte(numeroCompte, {
    dateDebut,
    dateFin,
    inclureLettres,
  });

  if (!data) {
    return c.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "Compte non trouvé ou sans mouvements" },
      },
      404
    );
  }

  return c.json({
    success: true,
    data,
  });
});

/**
 * GET /grand-livre/solde/:numero
 * Solde d'un compte à une date donnée
 */
grandLivre.get("/solde/:numero", async (c) => {
  const numeroCompte = c.req.param("numero");
  const date = c.req.query("date") || new Date().toISOString().split("T")[0];

  const data = await getSoldeCompteAtDate(numeroCompte, date);

  return c.json({
    success: true,
    data: {
      numero_compte: numeroCompte,
      date,
      ...data,
    },
  });
});

// Schema pour recherche avancée
const SearchSchema = z.object({
  compte_debut: z.string().optional(),
  compte_fin: z.string().optional(),
  date_debut: z.string().optional(),
  date_fin: z.string().optional(),
  journal_code: z.string().optional(),
  tiers_code: z.string().optional(),
  inclure_lettres: z.boolean().optional(),
});

/**
 * POST /grand-livre/search
 * Recherche avancée dans le grand livre
 */
grandLivre.post(
  "/search",
  zValidator("json", SearchSchema),
  async (c) => {
    const filter = c.req.valid("json");
    const data = await searchGrandLivre(filter);

    return c.json({
      success: true,
      data,
      count: data.length,
    });
  }
);

export { grandLivre };
