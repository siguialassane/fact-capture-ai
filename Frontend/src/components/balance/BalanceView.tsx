import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Scale,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { getBalance } from "@/lib/api/backend-client";
import type { BalanceEntry } from "@/lib/api/types";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CLASSES_COMPTABLES: Record<string, string> = {
  "1": "Capitaux",
  "2": "Immobilisations",
  "3": "Stocks",
  "4": "Tiers",
  "5": "Trésorerie",
  "6": "Charges",
  "7": "Produits",
  "8": "Comptes spéciaux",
};

function fmtAmount(val: number): string {
  return val.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function BalanceView() {
  const [classeFilter, setClasseFilter] = useState<string>("all");

  const { data: balance, isLoading, error } = useQuery({
    queryKey: ["balance"],
    queryFn: () => getBalance(),
  });

  // Filter by classe
  const filteredComptes = useMemo(() => {
    if (!balance?.comptes) return [];
    if (classeFilter === "all") return balance.comptes;
    return balance.comptes.filter((c) =>
      c.numero_compte.startsWith(classeFilter)
    );
  }, [balance?.comptes, classeFilter]);

  // KPI cards
  const totals = useMemo(() => {
    if (!balance) return null;
    const ecart = Math.abs(balance.total_solde_debit - balance.total_solde_credit);
    return {
      mouvDebit: balance.total_mouvement_debit,
      mouvCredit: balance.total_mouvement_credit,
      soldeDebit: balance.total_solde_debit,
      soldeCredit: balance.total_solde_credit,
      equilibre: ecart < 0.01,
      ecart,
      nbComptes: balance.comptes.length,
    };
  }, [balance]);

  const columns: DataTableColumn<BalanceEntry>[] = useMemo(
    () => [
      {
        id: "numero_compte",
        header: "N° Compte",
        accessorKey: "numero_compte",
        width: 110,
        cell: (row) => (
          <span className="font-mono text-sm font-medium text-slate-800">
            {row.numero_compte}
          </span>
        ),
      },
      {
        id: "libelle_compte",
        header: "Libellé",
        accessorKey: "libelle_compte",
        minWidth: 200,
        cell: (row) => (
          <span className="text-sm text-slate-700 truncate block max-w-[300px]">
            {row.libelle_compte}
          </span>
        ),
      },
      {
        id: "classe",
        header: "Classe",
        accessorFn: (row) => row.numero_compte.charAt(0),
        width: 100,
        cell: (row) => {
          const cls = row.numero_compte.charAt(0);
          return (
            <Badge variant="secondary" className="text-[10px] font-normal">
              {cls} - {CLASSES_COMPTABLES[cls] || cls}
            </Badge>
          );
        },
      },
      {
        id: "mouvement_debit",
        header: "Mouv. Débit",
        accessorKey: "mouvement_debit",
        numeric: true,
        width: 130,
        cell: (row) => (
          <span className={cn("text-sm", row.mouvement_debit > 0 && "text-slate-800")}>
            {row.mouvement_debit > 0 ? fmtAmount(row.mouvement_debit) : "–"}
          </span>
        ),
        footer: (rows) => (
          <span className="text-blue-700 font-bold">
            {fmtAmount(rows.reduce((s, r) => s + r.mouvement_debit, 0))}
          </span>
        ),
      },
      {
        id: "mouvement_credit",
        header: "Mouv. Crédit",
        accessorKey: "mouvement_credit",
        numeric: true,
        width: 130,
        cell: (row) => (
          <span className={cn("text-sm", row.mouvement_credit > 0 && "text-slate-800")}>
            {row.mouvement_credit > 0 ? fmtAmount(row.mouvement_credit) : "–"}
          </span>
        ),
        footer: (rows) => (
          <span className="text-blue-700 font-bold">
            {fmtAmount(rows.reduce((s, r) => s + r.mouvement_credit, 0))}
          </span>
        ),
      },
      {
        id: "solde_debit",
        header: "Solde Débit",
        accessorKey: "solde_debit",
        numeric: true,
        width: 130,
        cell: (row) => (
          <span className={cn("text-sm font-medium", row.solde_debit > 0 && "text-emerald-700")}>
            {row.solde_debit > 0 ? fmtAmount(row.solde_debit) : "–"}
          </span>
        ),
        footer: (rows) => (
          <span className="text-emerald-700 font-bold">
            {fmtAmount(rows.reduce((s, r) => s + r.solde_debit, 0))}
          </span>
        ),
      },
      {
        id: "solde_credit",
        header: "Solde Crédit",
        accessorKey: "solde_credit",
        numeric: true,
        width: 130,
        cell: (row) => (
          <span className={cn("text-sm font-medium", row.solde_credit > 0 && "text-orange-600")}>
            {row.solde_credit > 0 ? fmtAmount(row.solde_credit) : "–"}
          </span>
        ),
        footer: (rows) => (
          <span className="text-orange-600 font-bold">
            {fmtAmount(rows.reduce((s, r) => s + r.solde_credit, 0))}
          </span>
        ),
      },
    ],
    []
  );

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">
          <p className="font-medium">Erreur de chargement</p>
          <p className="text-sm mt-1">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* KPI Cards */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Mouvements Débit"
            value={fmtAmount(totals.mouvDebit) + " FCFA"}
            icon={ArrowDownRight}
            color="blue"
          />
          <KpiCard
            label="Total Mouvements Crédit"
            value={fmtAmount(totals.mouvCredit) + " FCFA"}
            icon={ArrowUpRight}
            color="indigo"
          />
          <KpiCard
            label="Comptes actifs"
            value={String(totals.nbComptes)}
            icon={TrendingUp}
            color="slate"
          />
          <KpiCard
            label="Équilibre"
            value={totals.equilibre ? "Équilibré" : `Écart: ${fmtAmount(totals.ecart)}`}
            icon={totals.equilibre ? Scale : AlertTriangle}
            color={totals.equilibre ? "green" : "amber"}
          />
        </div>
      )}

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredComptes}
        loading={isLoading}
        showFooter
        exportable
        exportFileName="balance_generale"
        searchPlaceholder="Rechercher un compte..."
        searchFilter={(row, q) => {
          const lower = q.toLowerCase();
          return (
            row.numero_compte.toLowerCase().includes(lower) ||
            row.libelle_compte.toLowerCase().includes(lower)
          );
        }}
        compact
        emptyMessage="Aucun compte trouvé"
        toolbarActions={
          <Select value={classeFilter} onValueChange={setClasseFilter}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Toutes les classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes</SelectItem>
              {Object.entries(CLASSES_COMPTABLES).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {k} - {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-600",
  };
  const iconClass = colorMap[color] || colorMap.slate;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", iconClass)}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 truncate">{label}</p>
          <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
        </div>
      </div>
    </div>
  );
}
