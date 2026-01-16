/**
 * Accounting Routes
 * 
 * Routes API pour la génération et gestion des écritures comptables
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generateAccountingEntry, refineAccountingEntry, type AccountingResult } from "../services/accounting";
import { getSupabase } from "../lib/supabase";

const accounting = new Hono();

// Schema pour la génération d'écriture
const GenerateEntrySchema = z.object({
  invoiceData: z.record(z.any()), // FlexibleInvoiceAIResult
  invoiceId: z.number().optional(), // ID de la facture source
  statutPaiement: z.enum(["paye", "non_paye", "partiel", "inconnu"]).optional(),
  montantPartiel: z.number().optional(),
});

// Schema pour l'affinement d'écriture
const RefineEntrySchema = z.object({
  previousEntry: z.object({
    date_piece: z.string(),
    numero_piece: z.string(),
    journal_code: z.string(),
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
      tiers_code: z.string().optional(),
    })),
    total_debit: z.number(),
    total_credit: z.number(),
    equilibre: z.boolean(),
    commentaires: z.string().optional(),
    reasoning: z.string().optional(),
  }),
  userFeedback: z.string(),
  originalInvoiceData: z.record(z.any()),
});

// Schema pour la sauvegarde
const SaveEntrySchema = z.object({
  ecriture: z.object({
    date_piece: z.string(),
    numero_piece: z.string(),
    journal_code: z.string(),
    journal_libelle: z.string().optional(),
    libelle_general: z.string(),
    tiers_code: z.string().optional(),
    tiers_nom: z.string().optional(),
    lignes: z.array(z.object({
      numero_compte: z.string(),
      libelle_compte: z.string().optional(),
      libelle_ligne: z.string(),
      debit: z.number(),
      credit: z.number(),
      tiers_code: z.string().optional(),
    })),
    total_debit: z.number(),
    total_credit: z.number(),
    equilibre: z.boolean(),
    commentaires: z.string().optional(),
    reasoning: z.string().optional(),
  }),
  invoiceId: z.number().optional(),
  iaModel: z.string().optional(),
  iaReasoning: z.string().optional(),
  iaSuggestions: z.array(z.string()).optional(),
});

/**
 * POST /accounting/generate
 * Génère une écriture comptable à partir des données de facture
 */
accounting.post(
  "/generate",
  zValidator("json", GenerateEntrySchema),
  async (c) => {
    const { invoiceData, invoiceId, statutPaiement, montantPartiel } = c.req.valid("json");

    console.log("[Accounting API] Génération d'écriture comptable...");

    try {
      // Récupérer le contexte comptable depuis la base de données
      const accountingContext = await getAccountingContext();

      const result: AccountingResult = await generateAccountingEntry(
        invoiceData as any,
        accountingContext,
        {
          statutPaiement,
          montantPartiel,
        }
      );

      if (!result.success) {
        return c.json({
          success: false,
          error: {
            code: "GENERATION_FAILED",
            message: "Échec de la génération de l'écriture comptable",
            details: result.erreurs,
          },
        }, 500);
      }

      return c.json({
        success: true,
        data: {
          ecriture: result.ecriture,
          reasoning: result.reasoning_details,
          suggestions: result.suggestions,
          invoiceId,
        },
      });
    } catch (error) {
      console.error("[Accounting API] Erreur:", error);
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Erreur interne lors de la génération",
          details: error instanceof Error ? error.message : String(error),
        },
      }, 500);
    }
  }
);

/**
 * POST /accounting/refine
 * Affine une écriture comptable avec feedback utilisateur
 */
accounting.post(
  "/refine",
  zValidator("json", RefineEntrySchema),
  async (c) => {
    const { previousEntry, userFeedback, originalInvoiceData } = c.req.valid("json");

    console.log("[Accounting API] Affinement d'écriture comptable...");

    try {
      const result: AccountingResult = await refineAccountingEntry(
        previousEntry as any,
        userFeedback,
        originalInvoiceData as any
      );

      if (!result.success) {
        return c.json({
          success: false,
          error: {
            code: "REFINEMENT_FAILED",
            message: "Échec de l'affinement de l'écriture comptable",
            details: result.erreurs,
          },
        }, 500);
      }

      return c.json({
        success: true,
        data: {
          ecriture: result.ecriture,
          reasoning: result.reasoning_details,
          suggestions: result.suggestions,
        },
      });
    } catch (error) {
      console.error("[Accounting API] Erreur:", error);
      return c.json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Erreur interne lors de l'affinement",
          details: error instanceof Error ? error.message : String(error),
        },
      }, 500);
    }
  }
);

/**
 * GET /accounting/plan-comptable
 * Récupère le plan comptable simplifié pour le frontend
 */
accounting.get("/plan-comptable", async (c) => {
  try {
    // Récupérer le plan comptable depuis la base de données
    const { data: comptes, error } = await getSupabase()
      .from("plan_comptable")
      .select("numero_compte, libelle, classe, type_compte, sens_normal")
      .eq("est_utilisable", true)
      .order("numero_compte");

    if (error) {
      console.error("[Accounting API] Erreur plan comptable:", error);
      throw error;
    }

    // Type pour les comptes
    type Compte = { numero_compte: string; libelle: string; classe: number; type_compte: string; sens_normal: string };

    // Organiser par catégorie
    const planComptable = {
      charges: (comptes as Compte[])?.filter((c: Compte) => c.classe === 6) || [],
      produits: (comptes as Compte[])?.filter((c: Compte) => c.classe === 7) || [],
      tiers: (comptes as Compte[])?.filter((c: Compte) => c.classe === 4) || [],
      immobilisations: (comptes as Compte[])?.filter((c: Compte) => c.classe === 2) || [],
      stocks: (comptes as Compte[])?.filter((c: Compte) => c.classe === 3) || [],
      tresorerie: (comptes as Compte[])?.filter((c: Compte) => c.classe === 5) || [],
      capitaux: (comptes as Compte[])?.filter((c: Compte) => c.classe === 1) || [],
      resultats: (comptes as Compte[])?.filter((c: Compte) => c.classe === 8) || [],
    };

    return c.json({
      success: true,
      data: planComptable,
    });
  } catch (error) {
    console.error("[Accounting API] Erreur:", error);
    return c.json({
      success: false,
      error: {
        code: "FETCH_ERROR",
        message: "Erreur lors de la récupération du plan comptable",
      },
    }, 500);
  }
});

/**
 * POST /accounting/save
 * Sauvegarde une écriture comptable dans la base de données
 */
accounting.post(
  "/save",
  zValidator("json", SaveEntrySchema),
  async (c) => {
    const { ecriture, invoiceId, iaModel, iaReasoning, iaSuggestions } = c.req.valid("json");

    console.log("[Accounting API] Sauvegarde de l'écriture comptable...");

    try {
      // Vérifier l'équilibre
      if (!ecriture.equilibre) {
        return c.json({
          success: false,
          error: {
            code: "UNBALANCED_ENTRY",
            message: "L'écriture n'est pas équilibrée. Débit ≠ Crédit",
            details: {
              total_debit: ecriture.total_debit,
              total_credit: ecriture.total_credit,
            },
          },
        }, 400);
      }

      // Rechercher le tiers par code ou raison sociale
      let tiersId = null;
      if (ecriture.tiers_code || ecriture.tiers_nom) {
        const { data: tiers } = await getSupabase()
          .from("tiers")
          .select("id")
          .or(`code.eq.${ecriture.tiers_code},raison_sociale.ilike.%${ecriture.tiers_nom}%`)
          .limit(1)
          .single();
        tiersId = tiers?.id;
      }

      // Déterminer l'exercice comptable à partir de la date de pièce
      const datePiece = new Date(ecriture.date_piece);
      const exerciceCode = datePiece.getFullYear().toString();

      // Insérer l'écriture principale
      const { data: entry, error: entryError } = await getSupabase()
        .from("journal_entries")
        .insert({
          numero_piece: ecriture.numero_piece,
          date_piece: ecriture.date_piece,
          date_comptable: new Date().toISOString().split('T')[0],
          journal_code: ecriture.journal_code,
          exercice_code: exerciceCode,
          libelle: ecriture.libelle_general,
          invoice_id: invoiceId || null,
          tiers_id: tiersId,
          tiers_code: ecriture.tiers_code,
          tiers_nom: ecriture.tiers_nom,
          montant_total: ecriture.total_debit,
          total_debit: ecriture.total_debit,
          total_credit: ecriture.total_credit,
          statut: "brouillon",
          genere_par_ia: true,
          ia_model: iaModel || "moonshotai/kimi-k2-thinking",
          ia_reasoning: iaReasoning || ecriture.reasoning,
          ia_suggestions: iaSuggestions ? JSON.stringify(iaSuggestions) : null,
          notes: ecriture.commentaires,
        })
        .select()
        .single();

      if (entryError) {
        console.error("[Accounting API] Erreur insertion écriture:", entryError);
        throw entryError;
      }

      // Insérer les lignes
      const lignesData = ecriture.lignes.map((ligne, index) => ({
        entry_id: entry.id,
        compte_numero: ligne.numero_compte,
        libelle_compte: ligne.libelle_compte,
        libelle: ligne.libelle_ligne,
        debit: ligne.debit,
        credit: ligne.credit,
        tiers_code: ligne.tiers_code,
        numero_ligne: index + 1,
        ligne_ordre: index + 1,
      }));

      const { error: lignesError } = await getSupabase()
        .from("journal_entry_lines")
        .insert(lignesData);

      if (lignesError) {
        console.error("[Accounting API] Erreur insertion lignes:", lignesError);
        // Rollback: supprimer l'écriture si les lignes échouent
        await getSupabase().from("journal_entries").delete().eq("id", entry.id);
        throw lignesError;
      }

      // Logger l'audit
      await getSupabase().from("control_audit_log").insert({
        control_type: "entry_saved",
        entity_type: "journal_entry",
        entity_id: entry.id,
        status: "passed",
        message: `Écriture ${ecriture.numero_piece} sauvegardée avec succès`,
        details: {
          lignes_count: ecriture.lignes.length,
          total: ecriture.total_debit,
          genere_par_ia: true,
        },
        executed_by: "user",
      });

      console.log("[Accounting API] Écriture sauvegardée:", entry.id);

      return c.json({
        success: true,
        data: {
          entryId: entry.id,
          message: "Écriture comptable sauvegardée avec succès",
        },
      });
    } catch (error) {
      console.error("[Accounting API] Erreur sauvegarde:", error);
      return c.json({
        success: false,
        error: {
          code: "SAVE_ERROR",
          message: "Erreur lors de la sauvegarde de l'écriture",
          details: error instanceof Error ? error.message : String(error),
        },
      }, 500);
    }
  }
);

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

    // Filtrer par invoice_id si fourni
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

/**
 * POST /accounting/entries/:id/validate
 * Valide une écriture comptable (passe du statut "brouillon" à "valide")
 */
accounting.post("/entries/:id/validate", async (c) => {
  try {
    const entryId = c.req.param("id");

    console.log(`[Accounting API] Validation de l'écriture ${entryId}...`);

    // Vérifier que l'écriture existe et est bien en brouillon
    const { data: entry, error: fetchError } = await getSupabase()
      .from("journal_entries")
      .select("*")
      .eq("id", entryId)
      .single();

    if (fetchError || !entry) {
      return c.json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Écriture comptable introuvable",
        },
      }, 404);
    }

    if (entry.statut !== "brouillon") {
      return c.json({
        success: false,
        error: {
          code: "INVALID_STATUS",
          message: `Cette écriture est déjà au statut "${entry.statut}"`,
        },
      }, 400);
    }

    // Mettre à jour le statut à "valide"
    const { data: updatedEntry, error: updateError } = await getSupabase()
      .from("journal_entries")
      .update({
        statut: "valide",
        validated_at: new Date().toISOString(),
      })
      .eq("id", entryId)
      .select()
      .single();

    if (updateError) {
      console.error("[Accounting API] Erreur validation:", updateError);
      throw updateError;
    }

    // Logger l'audit
    await getSupabase().from("control_audit_log").insert({
      control_type: "entry_validated",
      entity_type: "journal_entry",
      entity_id: entryId,
      status: "passed",
      message: `Écriture ${entry.numero_piece} validée avec succès`,
      details: {
        previous_status: "brouillon",
        new_status: "valide",
      },
      executed_by: "user",
    });

    console.log(`[Accounting API] Écriture ${entryId} validée avec succès`);

    return c.json({
      success: true,
      data: {
        entry: updatedEntry,
        message: "Écriture validée avec succès",
      },
    });
  } catch (error) {
    console.error("[Accounting API] Erreur validation:", error);
    return c.json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Erreur lors de la validation de l'écriture",
        details: error instanceof Error ? error.message : String(error),
      },
    }, 500);
  }
});

/**
 * GET /accounting/duplicates
 * Récupère les factures potentiellement en double
 */
accounting.get("/duplicates", async (c) => {
  try {
    const { data: duplicates, error } = await getSupabase()
      .from("invoice_duplicates")
      .select(`
        *,
        invoice:invoice_id (id, ai_result),
        duplicate:duplicate_of (id, ai_result)
      `)
      .eq("resolution", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return c.json({
      success: true,
      data: duplicates,
    });
  } catch (error) {
    console.error("[Accounting API] Erreur:", error);
    return c.json({
      success: false,
      error: {
        code: "FETCH_ERROR",
        message: "Erreur lors de la récupération des doublons",
      },
    }, 500);
  }
});

/**
 * GET /accounting/tiers
 * Récupère la liste des tiers (fournisseurs/clients)
 */
accounting.get("/tiers", async (c) => {
  try {
    const type = c.req.query("type"); // 'fournisseur' ou 'client'

    let query = getSupabase()
      .from("tiers")
      .select("id, code, nom, type_tiers, numero_compte_defaut, adresse, ville, pays")
      .eq("actif", true)
      .order("nom");

    if (type) {
      query = query.eq("type_tiers", type);
    }

    const { data: tiers, error } = await query;

    if (error) throw error;

    return c.json({
      success: true,
      data: tiers,
    });
  } catch (error) {
    console.error("[Accounting API] Erreur:", error);
    return c.json({
      success: false,
      error: {
        code: "FETCH_ERROR",
        message: "Erreur lors de la récupération des tiers",
      },
    }, 500);
  }
});

/**
 * GET /accounting/context
 * Récupère le contexte comptable complet pour l'IA
 */
accounting.get("/context", async (c) => {
  try {
    const context = await getAccountingContext();
    return c.json({
      success: true,
      data: context,
    });
  } catch (error) {
    console.error("[Accounting API] Erreur:", error);
    return c.json({
      success: false,
      error: {
        code: "FETCH_ERROR",
        message: "Erreur lors de la récupération du contexte",
      },
    }, 500);
  }
});

// Schema pour le chat comptable
const ChatSchema = z.object({
  message: z.string(),
  entry: z.object({
    date_piece: z.string(),
    numero_piece: z.string(),
    journal_code: z.string(),
    journal_libelle: z.string().optional(),
    libelle_general: z.string(),
    tiers_nom: z.string().optional(),
    lignes: z.array(z.object({
      numero_compte: z.string(),
      libelle_compte: z.string().optional(),
      libelle_ligne: z.string(),
      debit: z.number(),
      credit: z.number(),
    })),
    total_debit: z.number(),
    total_credit: z.number(),
    equilibre: z.boolean(),
  }),
});

/**
 * POST /accounting/chat
 * Chat avec Gemini à propos d'une écriture comptable
 */
accounting.post(
  "/chat",
  zValidator("json", ChatSchema),
  async (c) => {
    const { message, entry } = c.req.valid("json");

    console.log("[Accounting Chat] Question:", message);

    try {
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
      const GEMINI_MODEL = process.env.GEMINI_MODEL || "moonshotai/kimi-k2-thinking";

      if (!OPENROUTER_API_KEY) {
        return c.json({
          success: false,
          error: { code: "CONFIG_ERROR", message: "API non configurée" },
        }, 500);
      }

      // Construire le contexte de l'écriture
      const entryContext = `
## ÉCRITURE COMPTABLE EN COURS

Date : ${entry.date_piece}
N° Pièce : ${entry.numero_piece}
Journal : ${entry.journal_code} - ${entry.journal_libelle || ""}
Tiers : ${entry.tiers_nom || "Non identifié"}
Libellé : ${entry.libelle_general}

### LIGNES DE L'ÉCRITURE :
${entry.lignes.map(l => `- ${l.numero_compte} | ${l.libelle_compte || l.libelle_ligne} | Débit: ${l.debit} | Crédit: ${l.credit}`).join('\n')}

TOTAL DÉBIT : ${entry.total_debit}
TOTAL CRÉDIT : ${entry.total_credit}
ÉQUILIBRÉE : ${entry.equilibre ? 'Oui' : 'Non'}
`;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          messages: [
            {
              role: "system",
              content: `Tu es un expert-comptable spécialisé en SYSCOHADA (comptabilité africaine).
Tu aides l'utilisateur à comprendre une écriture comptable générée automatiquement.
Réponds de manière claire, concise et pédagogique en français.
Si on te demande de modifier l'écriture, explique ce qu'il faudrait changer.

${entryContext}`,
            },
            {
              role: "user",
              content: message,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Accounting Chat] Erreur API:", errorText);
        return c.json({
          success: false,
          error: { code: "API_ERROR", message: "Erreur de communication avec l'IA" },
        }, 500);
      }

      const result = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const reply = result.choices?.[0]?.message?.content || "Je n'ai pas pu générer de réponse.";

      return c.json({
        success: true,
        data: { reply },
      });
    } catch (error) {
      console.error("[Accounting Chat] Erreur:", error);
      return c.json({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Erreur interne" },
      }, 500);
    }
  }
);

/**
 * Fonction helper pour récupérer le contexte comptable depuis la DB
 */
async function getAccountingContext() {
  // Plan comptable
  const { data: comptes } = await getSupabase()
    .from("plan_comptable")
    .select("numero_compte, libelle, classe, type_compte, sens_normal")
    .eq("est_utilisable", true)
    .in("classe", [2, 3, 4, 5, 6, 7])
    .order("numero_compte");

  // Tiers (fournisseurs et clients)
  const { data: tiers } = await getSupabase()
    .from("tiers")
    .select("code, raison_sociale, type_tiers, compte_comptable, est_actif")
    .eq("est_actif", true)
    .order("raison_sociale");

  // Taux de TVA
  const { data: taxRates } = await getSupabase()
    .from("tax_rates")
    .select("code, taux, libelle, est_actif")
    .eq("est_actif", true);

  // Journaux (utilise la table journaux unifiée)
  const { data: journauxData } = await getSupabase()
    .from("journaux")
    .select("code, libelle, type_operation")
    .eq("actif", true);

  // Infos entreprise
  const { data: company } = await getSupabase()
    .from("company_info")
    .select("*")
    .single();

  // Mapper type_operation vers type_journal pour compatibilité avec AccountingContext
  const journaux = (journauxData || []).map((j: { code: string; libelle: string; type_operation: string }) => ({
    code: j.code,
    libelle: j.libelle,
    type_journal: j.type_operation, // Alias pour compatibilité
  }));

  return {
    plan_comptable: comptes || [],
    tiers: (tiers || []).map((t: { code: string; raison_sociale: string; type_tiers: string; compte_comptable: string }) => ({
      code: t.code,
      nom: t.raison_sociale,
      type_tiers: t.type_tiers,
      numero_compte_defaut: t.compte_comptable,
    })),
    taux_tva: (taxRates || []).map((t: { code: string; taux: number; libelle: string }) => ({
      code: t.code,
      taux: t.taux,
      libelle: t.libelle,
    })),
    journaux,
    entreprise: company
      ? {
          nom: company.raison_sociale,
          forme_juridique: company.forme_juridique,
          adresse: company.adresse,
          ville: company.ville,
          pays: company.pays,
        }
      : null,
  };
}

export default accounting;
