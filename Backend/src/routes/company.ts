import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getSupabase } from "../lib/supabase";

export const companyRoutes = new Hono();

const CompanySchema = z.object({
  raison_sociale: z.string().min(1),
  forme_juridique: z.string().optional().nullable(),
  capital_social: z.number().optional().nullable(),
  devise: z.string().optional().nullable(),
  rccm: z.string().optional().nullable(),
  ncc: z.string().optional().nullable(),
  adresse: z.string().optional().nullable(),
  ville: z.string().optional().nullable(),
  pays: z.string().optional().nullable(),
  telephone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  site_web: z.string().optional().nullable(),
  secteur_activite: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  date_creation: z.string().optional().nullable(),
  exercice_debut: z.number().optional().nullable(),
});

const CompanyUpdateSchema = CompanySchema.partial();

/**
 * GET /api/company
 * Récupère les informations de l'entreprise
 */
companyRoutes.get("/", async (c) => {
  const { data, error } = await getSupabase()
    .from("company_info")
    .select("*")
    .single();

  if (error && error.code !== "PGRST116") {
    return c.json(
      {
        success: false,
        error: { code: "FETCH_ERROR", message: "Impossible de récupérer l'entreprise" },
      },
      500
    );
  }

  return c.json({ success: true, data: data || null });
});

/**
 * PATCH /api/company
 * Met à jour (ou crée) les informations de l'entreprise
 */
companyRoutes.patch(
  "/",
  zValidator("json", CompanyUpdateSchema),
  async (c) => {
    const payload = c.req.valid("json");

    if (Object.keys(payload).length === 0) {
      return c.json(
        {
          success: false,
          error: { code: "EMPTY_PAYLOAD", message: "Aucune donnée à mettre à jour" },
        },
        400
      );
    }

    const { data: existing } = await getSupabase()
      .from("company_info")
      .select("id")
      .single();

    const updatePayload = existing?.id
      ? { id: existing.id, ...payload }
      : payload;

    const { data, error } = await getSupabase()
      .from("company_info")
      .upsert(updatePayload, { onConflict: "id" })
      .select("*")
      .single();

    if (error) {
      return c.json(
        {
          success: false,
          error: { code: "UPDATE_ERROR", message: "Impossible de mettre à jour l'entreprise" },
        },
        500
      );
    }

    return c.json({ success: true, data });
  }
);