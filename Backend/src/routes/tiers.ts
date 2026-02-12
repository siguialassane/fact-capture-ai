/**
 * Routes API Tiers
 * CRUD pour la gestion des clients, fournisseurs, etc.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getSupabase } from "../lib/supabase";

const tiers = new Hono();

// ─── GET /tiers — Liste paginée ───────────────────────────────
tiers.get("/", async (c) => {
  const supabase = getSupabase();
  const typeTiers = c.req.query("type_tiers"); // client, fournisseur, etc.
  const search = c.req.query("search");
  const actifOnly = c.req.query("actif") !== "false";

  let query = supabase
    .from("tiers")
    .select("*")
    .order("raison_sociale", { ascending: true });

  if (typeTiers) {
    query = query.eq("type_tiers", typeTiers);
  }
  if (actifOnly) {
    query = query.eq("est_actif", true);
  }
  if (search) {
    query = query.or(
      `code.ilike.%${search}%,raison_sociale.ilike.%${search}%,nom_commercial.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return c.json(
      { success: false, error: { code: "DB_ERROR", message: error.message } },
      500
    );
  }

  return c.json({ success: true, data: data || [] });
});

// ─── GET /tiers/:id — Détail ─────────────────────────────────
tiers.get("/:id", async (c) => {
  const supabase = getSupabase();
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("tiers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return c.json(
      { success: false, error: { code: "NOT_FOUND", message: "Tiers non trouvé" } },
      404
    );
  }

  return c.json({ success: true, data });
});

// ─── Schemas ──────────────────────────────────────────────────
const CreateTiersSchema = z.object({
  code: z.string().min(1).max(20),
  type_tiers: z.enum(["client", "fournisseur", "salarie", "associe", "banque", "autre"]),
  raison_sociale: z.string().min(1).max(200),
  nom_commercial: z.string().max(200).optional(),
  adresse: z.string().optional(),
  ville: z.string().max(100).optional(),
  pays: z.string().max(100).optional(),
  telephone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal("")),
  rccm: z.string().max(50).optional(),
  ncc: z.string().max(50).optional(),
  compte_comptable: z.string().max(20).optional(),
  conditions_paiement: z.string().max(100).optional(),
  delai_paiement_jours: z.number().int().min(0).optional(),
  plafond_credit: z.number().min(0).optional(),
  devise: z.string().max(5).optional(),
  contact_nom: z.string().max(100).optional(),
  contact_telephone: z.string().max(30).optional(),
  contact_email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
  est_actif: z.boolean().optional().default(true),
});

const UpdateTiersSchema = CreateTiersSchema.partial();

// ─── POST /tiers — Création ─────────────────────────────────
tiers.post(
  "/",
  zValidator("json", CreateTiersSchema),
  async (c) => {
    const supabase = getSupabase();
    const body = c.req.valid("json");

    // Check code uniqueness
    const { data: existing } = await supabase
      .from("tiers")
      .select("id")
      .eq("code", body.code)
      .maybeSingle();

    if (existing) {
      return c.json(
        { success: false, error: { code: "DUPLICATE", message: `Le code tiers "${body.code}" existe déjà` } },
        409
      );
    }

    const { data, error } = await supabase
      .from("tiers")
      .insert(body)
      .select()
      .single();

    if (error) {
      return c.json(
        { success: false, error: { code: "DB_ERROR", message: error.message } },
        500
      );
    }

    return c.json({ success: true, data }, 201);
  }
);

// ─── PUT /tiers/:id — Mise à jour ───────────────────────────
tiers.put(
  "/:id",
  zValidator("json", UpdateTiersSchema),
  async (c) => {
    const supabase = getSupabase();
    const id = c.req.param("id");
    const body = c.req.valid("json");

    const { data, error } = await supabase
      .from("tiers")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return c.json(
        { success: false, error: { code: "DB_ERROR", message: error.message } },
        500
      );
    }

    return c.json({ success: true, data });
  }
);

// ─── DELETE /tiers/:id — Suppression (soft: désactivation) ──
tiers.delete("/:id", async (c) => {
  const supabase = getSupabase();
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("tiers")
    .update({ est_actif: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return c.json(
      { success: false, error: { code: "DB_ERROR", message: error.message } },
      500
    );
  }

  return c.json({ success: true, data });
});

export { tiers as tiersRoutes };
