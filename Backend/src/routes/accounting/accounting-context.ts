import { getSupabase } from "../../lib/supabase";

export async function getAccountingContext() {
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

  const journaux = (journauxData || []).map((j: { code: string; libelle: string; type_operation: string }) => ({
    code: j.code,
    libelle: j.libelle,
    type_journal: j.type_operation,
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
