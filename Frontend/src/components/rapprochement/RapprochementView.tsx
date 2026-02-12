import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  Link2,
  Unlink,
  Zap,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  TrendingUp,
  AlertTriangle,
  Trash2,
  Download,
} from "lucide-react";
import { DataTable, type DataTableColumn } from "../ui/DataTable";

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReleveLine {
  id: string;
  date_operation: string;
  date_valeur: string;
  libelle: string;
  reference: string | null;
  montant: number;
  solde_progressif: number | null;
  est_rapproche: boolean;
}

interface EcritureBanque {
  id: string;
  date_piece: string;
  numero_piece: string;
  journal_code: string;
  libelle: string;
  debit: number;
  credit: number;
  montant_signe: number;
  compte_numero: string;
  tiers_code: string | null;
  est_rapproche: boolean;
}

interface Stats {
  releves: { total: number; rapproches: number; non_rapproches: number };
  ecritures: { total: number; rapproches: number };
  solde_releve: number;
  solde_comptable: number;
  ecart: number;
  taux_rapprochement: number;
}

// ─── API calls ───────────────────────────────────────────────────────────────

async function fetchReleves(): Promise<ReleveLine[]> {
  const res = await fetch(`${API}/api/rapprochement/releves`);
  const json = await res.json();
  return json.data || [];
}

async function fetchEcritures(): Promise<EcritureBanque[]> {
  const res = await fetch(`${API}/api/rapprochement/ecritures`);
  const json = await res.json();
  return json.data || [];
}

async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API}/api/rapprochement/statistiques`);
  const json = await res.json();
  return json.data;
}

async function importReleves(lignes: any[], fichier?: string) {
  const res = await fetch(`${API}/api/rapprochement/releves/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lignes, fichier_origine: fichier }),
  });
  return res.json();
}

async function rapprocher(releve_id: string, entry_line_id: string, montant: number) {
  const res = await fetch(`${API}/api/rapprochement/rapprocher`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ releve_id, entry_line_id, montant, methode: "manual" }),
  });
  return res.json();
}

async function autoRapprocher() {
  const res = await fetch(`${API}/api/rapprochement/auto-rapprocher`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tolerance_jours: 5 }),
  });
  return res.json();
}

async function clearReleves() {
  const res = await fetch(`${API}/api/rapprochement/releves`, { method: "DELETE" });
  return res.json();
}

// ─── CSV Parser ──────────────────────────────────────────────────────────────

function parseCSV(text: string): any[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  // Detect separator
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  // Map header names to our fields
  const dateIdx = headers.findIndex((h) =>
    h.includes("date") && (h.includes("op") || h.includes("transaction") || h === "date")
  );
  const valeurIdx = headers.findIndex((h) => h.includes("valeur"));
  const libelleIdx = headers.findIndex((h) =>
    h.includes("libell") || h.includes("description") || h.includes("motif")
  );
  const montantIdx = headers.findIndex((h) =>
    h.includes("montant") || h.includes("amount")
  );
  const debitIdx = headers.findIndex((h) => h.includes("debit") || h.includes("débit"));
  const creditIdx = headers.findIndex((h) => h.includes("credit") || h.includes("crédit"));
  const refIdx = headers.findIndex((h) =>
    h.includes("ref") || h.includes("numéro") || h.includes("numero")
  );
  const soldeIdx = headers.findIndex((h) => h.includes("solde") || h.includes("balance"));

  if (dateIdx === -1 || libelleIdx === -1) {
    throw new Error(
      "CSV invalide. Colonnes requises: date (date_operation), libellé (libelle). " +
      "Colonnes optionnelles: montant OU (débit + crédit), référence, solde."
    );
  }

  const result: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 2) continue;

    const dateStr = cols[dateIdx] || "";
    const libelle = cols[libelleIdx] || "";
    if (!dateStr || !libelle) continue;

    // Parse date (DD/MM/YYYY or YYYY-MM-DD)
    let dateFormatted = dateStr;
    if (dateStr.includes("/")) {
      const [d, m, y] = dateStr.split("/");
      dateFormatted = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    // Parse amount
    let montant = 0;
    if (montantIdx >= 0 && cols[montantIdx]) {
      montant = parseFloat(cols[montantIdx].replace(/\s/g, "").replace(",", "."));
    } else if (debitIdx >= 0 && creditIdx >= 0) {
      const debit = parseFloat((cols[debitIdx] || "0").replace(/\s/g, "").replace(",", ".")) || 0;
      const credit = parseFloat((cols[creditIdx] || "0").replace(/\s/g, "").replace(",", ".")) || 0;
      montant = credit - debit;
    }

    result.push({
      date_operation: dateFormatted,
      date_valeur: valeurIdx >= 0 && cols[valeurIdx]
        ? cols[valeurIdx].includes("/")
          ? (() => { const [d, m, y] = cols[valeurIdx].split("/"); return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`; })()
          : cols[valeurIdx]
        : dateFormatted,
      libelle,
      reference: refIdx >= 0 ? cols[refIdx] || null : null,
      montant,
      solde_progressif: soldeIdx >= 0 ? parseFloat((cols[soldeIdx] || "0").replace(/\s/g, "").replace(",", ".")) || null : null,
    });
  }

  return result;
}

// ─── Format helpers ──────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RapprochementView() {
  const queryClient = useQueryClient();
  const [selectedReleve, setSelectedReleve] = useState<string | null>(null);
  const [selectedEcriture, setSelectedEcriture] = useState<string | null>(null);
  const [tab, setTab] = useState<"vue" | "import">("vue");
  const [importError, setImportError] = useState<string | null>(null);
  const [showNonRapproOnly, setShowNonRapproOnly] = useState(true);

  const { data: releves = [], isLoading: loadingReleves } = useQuery({
    queryKey: ["rapprochement-releves"],
    queryFn: fetchReleves,
  });

  const { data: ecritures = [], isLoading: loadingEcritures } = useQuery({
    queryKey: ["rapprochement-ecritures"],
    queryFn: fetchEcritures,
  });

  const { data: stats } = useQuery({
    queryKey: ["rapprochement-stats"],
    queryFn: fetchStats,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["rapprochement-releves"] });
    queryClient.invalidateQueries({ queryKey: ["rapprochement-ecritures"] });
    queryClient.invalidateQueries({ queryKey: ["rapprochement-stats"] });
  };

  const importMutation = useMutation({
    mutationFn: ({ lignes, fichier }: { lignes: any[]; fichier?: string }) =>
      importReleves(lignes, fichier),
    onSuccess: (result) => {
      if (result.success) {
        invalidateAll();
        setTab("vue");
        setImportError(null);
      } else {
        setImportError(result.error);
      }
    },
  });

  const matchMutation = useMutation({
    mutationFn: ({ releve_id, entry_line_id, montant }: any) =>
      rapprocher(releve_id, entry_line_id, montant),
    onSuccess: () => {
      invalidateAll();
      setSelectedReleve(null);
      setSelectedEcriture(null);
    },
  });

  const autoMutation = useMutation({
    mutationFn: autoRapprocher,
    onSuccess: () => invalidateAll(),
  });

  const clearMutation = useMutation({
    mutationFn: clearReleves,
    onSuccess: () => invalidateAll(),
  });

  // Filtered data
  const filteredReleves = useMemo(
    () => (showNonRapproOnly ? releves.filter((r) => !r.est_rapproche) : releves),
    [releves, showNonRapproOnly]
  );

  const filteredEcritures = useMemo(
    () => (showNonRapproOnly ? ecritures.filter((e) => !e.est_rapproche) : ecritures),
    [ecritures, showNonRapproOnly]
  );

  // Get the selected releve object for matching
  const selectedReleveObj = releves.find((r) => r.id === selectedReleve);

  // Handle CSV file import
  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const lignes = parseCSV(text);
          if (lignes.length === 0) {
            setImportError("Aucune ligne valide trouvée dans le fichier.");
            return;
          }
          importMutation.mutate({ lignes, fichier: file.name });
        } catch (err: any) {
          setImportError(err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [importMutation]
  );

  // Handle manual match
  const handleMatch = useCallback(() => {
    if (!selectedReleve || !selectedEcriture || !selectedReleveObj) return;
    matchMutation.mutate({
      releve_id: selectedReleve,
      entry_line_id: selectedEcriture,
      montant: selectedReleveObj.montant,
    });
  }, [selectedReleve, selectedEcriture, selectedReleveObj, matchMutation]);

  // ─── Columns ─────────────────────────────────────────────────────────────

  const releveColumns: DataTableColumn<ReleveLine>[] = [
    {
      id: "date_operation",
      header: "DATE",
      accessorKey: "date_operation",
      sortable: true,
      cell: (r) => fmtDate(r.date_operation),
    },
    { id: "libelle", header: "LIBELLÉ", accessorKey: "libelle", sortable: true },
    { id: "reference", header: "RÉF.", accessorKey: "reference", sortable: true, cell: (r) => r.reference || "—" },
    {
      id: "montant",
      header: "MONTANT",
      accessorKey: "montant",
      sortable: true,
      align: "right",
      numeric: true,
      cell: (r) => (
        <span className={r.montant >= 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
          {r.montant >= 0 ? "+" : ""}{fmt(r.montant)}
        </span>
      ),
    },
    {
      id: "est_rapproche",
      header: "ÉTAT",
      accessorKey: "est_rapproche",
      cell: (r) =>
        r.est_rapproche ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
            <CheckCircle2 size={12} /> Rapproché
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            <XCircle size={12} /> En attente
          </span>
        ),
    },
  ];

  const ecritureColumns: DataTableColumn<EcritureBanque>[] = [
    {
      id: "date_piece",
      header: "DATE",
      accessorKey: "date_piece",
      sortable: true,
      cell: (e) => fmtDate(e.date_piece),
    },
    { id: "numero_piece", header: "N° PIÈCE", accessorKey: "numero_piece", sortable: true },
    { id: "libelle", header: "LIBELLÉ", accessorKey: "libelle", sortable: true },
    {
      id: "montant_signe",
      header: "MONTANT",
      accessorKey: "montant_signe",
      sortable: true,
      align: "right",
      numeric: true,
      cell: (e) => (
        <span className={e.montant_signe >= 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
          {e.montant_signe >= 0 ? "+" : ""}{fmt(e.montant_signe)}
        </span>
      ),
    },
    {
      id: "est_rapproche",
      header: "ÉTAT",
      accessorKey: "est_rapproche",
      cell: (e) =>
        e.est_rapproche ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
            <CheckCircle2 size={12} /> Rapproché
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
            <XCircle size={12} /> En attente
          </span>
        ),
    },
  ];

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <ArrowRightLeft size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Rapprochement Bancaire</h2>
            <p className="text-sm text-slate-500">
              Importez vos relevés et rapprochez avec les écritures comptables
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("import")}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
              tab === "import"
                ? "bg-indigo-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Upload size={16} /> Importer
          </button>
          <button
            onClick={() => setTab("vue")}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
              tab === "vue"
                ? "bg-indigo-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileSpreadsheet size={16} /> Rapprochement
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <FileSpreadsheet size={14} /> Lignes relevé
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.releves.total}</div>
            <div className="text-xs text-emerald-600">{stats.releves.rapproches} rapprochées</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <TrendingUp size={14} /> Taux rapprochement
            </div>
            <div className="text-2xl font-bold text-indigo-600">{stats.taux_rapprochement}%</div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all"
                style={{ width: `${stats.taux_rapprochement}%` }}
              />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <Download size={14} /> Solde relevé
            </div>
            <div className="text-2xl font-bold text-slate-900">{fmt(stats.solde_releve)}</div>
            <div className="text-xs text-slate-400">FCFA</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
              <AlertTriangle size={14} /> Écart
            </div>
            <div className={`text-2xl font-bold ${Math.abs(stats.ecart) < 1 ? "text-emerald-600" : "text-amber-600"}`}>
              {fmt(stats.ecart)}
            </div>
            <div className="text-xs text-slate-400">Relevé − Comptable</div>
          </div>
        </div>
      )}

      {/* Import Tab */}
      {tab === "import" && (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Importer un relevé bancaire</h3>
          <p className="text-sm text-slate-500 mb-6">
            Format CSV attendu : colonnes <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">date_operation</code>,{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">libelle</code>,{" "}
            <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">montant</code> (ou débit/crédit séparés).
            Séparateur : point-virgule ou virgule. Encodage : UTF-8.
          </p>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-300 transition cursor-pointer relative">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileImport}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload size={32} className="mx-auto text-slate-400 mb-3" />
            <p className="text-sm font-medium text-slate-700">
              Glissez votre fichier CSV ici ou cliquez pour parcourir
            </p>
            <p className="text-xs text-slate-400 mt-1">CSV uniquement • Max 10 Mo</p>
          </div>

          {importMutation.isPending && (
            <div className="mt-4 p-3 bg-indigo-50 text-indigo-700 rounded-lg text-sm">
              Import en cours...
            </div>
          )}

          {importError && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              Erreur : {importError}
            </div>
          )}

          {releves.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {releves.length} ligne(s) importée(s) au total
              </p>
              <button
                onClick={() => {
                  if (confirm("Supprimer toutes les lignes non rapprochées ?")) {
                    clearMutation.mutate();
                  }
                }}
                className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 flex items-center gap-1"
              >
                <Trash2 size={14} /> Purger non rapprochées
              </button>
            </div>
          )}
        </div>
      )}

      {/* Rapprochement Tab */}
      {tab === "vue" && (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => autoMutation.mutate()}
              disabled={autoMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              <Zap size={16} />
              {autoMutation.isPending ? "Rapprochement..." : "Auto-rapprocher"}
            </button>

            {selectedReleve && selectedEcriture && (
              <button
                onClick={handleMatch}
                disabled={matchMutation.isPending}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                <Link2 size={16} />
                {matchMutation.isPending ? "Liaison..." : "Lier la sélection"}
              </button>
            )}

            {(selectedReleve || selectedEcriture) && (
              <button
                onClick={() => { setSelectedReleve(null); setSelectedEcriture(null); }}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-50 transition"
              >
                <Unlink size={16} /> Annuler sélection
              </button>
            )}

            <label className="ml-auto flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showNonRapproOnly}
                onChange={(e) => setShowNonRapproOnly(e.target.checked)}
                className="rounded border-slate-300"
              />
              Non rapprochées uniquement
            </label>
          </div>

          {autoMutation.isSuccess && autoMutation.data?.success && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle2 size={16} />
              {autoMutation.data.data.matched} rapprochement(s) automatique(s) effectué(s)
              sur {autoMutation.data.data.total_releves} ligne(s) de relevé.
            </div>
          )}

          {/* Split view: Relevé (left) | Écritures (right) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Bank Statement */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-indigo-500" />
                  Relevé bancaire
                  <span className="text-xs font-normal text-slate-400">({filteredReleves.length})</span>
                </h3>
              </div>
              {filteredReleves.length === 0 && !loadingReleves ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Aucune ligne de relevé.{" "}
                  <button
                    onClick={() => setTab("import")}
                    className="text-indigo-600 underline"
                  >
                    Importer un CSV
                  </button>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">DATE</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">LIBELLÉ</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">MONTANT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReleves.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedReleve(selectedReleve === r.id ? null : r.id)}
                          className={`cursor-pointer border-b border-slate-100 transition ${
                            selectedReleve === r.id
                              ? "bg-indigo-50 border-indigo-200"
                              : "hover:bg-slate-50"
                          } ${r.est_rapproche ? "opacity-50" : ""}`}
                        >
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDate(r.date_operation)}</td>
                          <td className="px-3 py-2 text-slate-800 truncate max-w-[200px]" title={r.libelle}>
                            {r.libelle}
                          </td>
                          <td className={`px-3 py-2 text-right font-medium whitespace-nowrap ${
                            r.montant >= 0 ? "text-emerald-600" : "text-red-500"
                          }`}>
                            {r.montant >= 0 ? "+" : ""}{fmt(r.montant)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Journal Entries */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <ArrowRightLeft size={16} className="text-emerald-500" />
                  Écritures comptables (cpte 5xxx)
                  <span className="text-xs font-normal text-slate-400">({filteredEcritures.length})</span>
                </h3>
              </div>
              {filteredEcritures.length === 0 && !loadingEcritures ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Aucune écriture bancaire trouvée.
                </div>
              ) : (
                <div className="max-h-[500px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">DATE</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">N° PIÈCE</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">LIBELLÉ</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">MONTANT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEcritures.map((e) => (
                        <tr
                          key={e.id}
                          onClick={() => setSelectedEcriture(selectedEcriture === e.id ? null : e.id)}
                          className={`cursor-pointer border-b border-slate-100 transition ${
                            selectedEcriture === e.id
                              ? "bg-emerald-50 border-emerald-200"
                              : "hover:bg-slate-50"
                          } ${e.est_rapproche ? "opacity-50" : ""}`}
                        >
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDate(e.date_piece)}</td>
                          <td className="px-3 py-2 text-slate-500 text-xs font-mono">{e.numero_piece}</td>
                          <td className="px-3 py-2 text-slate-800 truncate max-w-[200px]" title={e.libelle}>
                            {e.libelle}
                          </td>
                          <td className={`px-3 py-2 text-right font-medium whitespace-nowrap ${
                            e.montant_signe >= 0 ? "text-emerald-600" : "text-red-500"
                          }`}>
                            {e.montant_signe >= 0 ? "+" : ""}{fmt(e.montant_signe)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Match indicator */}
          {selectedReleve && selectedEcriture && selectedReleveObj && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-indigo-700 font-medium">
                  Relevé: {selectedReleveObj.libelle.substring(0, 30)}...
                  ({fmt(selectedReleveObj.montant)} FCFA)
                </span>
                <ArrowRightLeft size={16} className="text-indigo-400" />
                <span className="text-emerald-700 font-medium">
                  Écriture: {ecritures.find((e) => e.id === selectedEcriture)?.libelle.substring(0, 30)}...
                </span>
              </div>
              <button
                onClick={handleMatch}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
              >
                Confirmer le rapprochement
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
