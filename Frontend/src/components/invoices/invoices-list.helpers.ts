export function formatMontant(montant: number | string | null | undefined): string {
  if (montant === null || montant === undefined || montant === "") return "0 FCFA";
  const value = typeof montant === "string"
    ? Number(montant.toString().replace(/[^0-9,.-]/g, "").replace(",", "."))
    : montant;
  if (Number.isNaN(value)) return "0 FCFA";
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + " FCFA";
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getLatestEntry<E extends { created_at: string }>(inv: { journal_entries?: E[] | null }): E | null {
  const entries = inv.journal_entries || [];
  if (entries.length === 0) return null;
  return [...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

export function getFournisseurName(result: any): string {
  if (!result) return "";
  if (typeof result.fournisseur === "string") return result.fournisseur;
  if (result?.fournisseur?.raison_sociale) return result.fournisseur.raison_sociale;
  if (result?.client) return result.client;
  return "";
}
