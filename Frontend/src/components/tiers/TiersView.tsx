import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Building2,
  Phone,
  Mail,
  MapPin,
  X,
} from "lucide-react";
import { config } from "@/lib/config";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────

interface Tiers {
  id: string;
  code: string;
  type_tiers: string;
  raison_sociale: string;
  nom_commercial?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  telephone?: string;
  email?: string;
  rccm?: string;
  ncc?: string;
  compte_comptable?: string;
  conditions_paiement?: string;
  delai_paiement_jours?: number;
  plafond_credit?: number;
  devise?: string;
  contact_nom?: string;
  contact_telephone?: string;
  contact_email?: string;
  notes?: string;
  est_actif: boolean;
  created_at: string;
  updated_at: string;
}

const TYPES_TIERS = [
  { value: "client", label: "Client", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "fournisseur", label: "Fournisseur", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "salarie", label: "Salarié", color: "bg-green-50 text-green-700 border-green-200" },
  { value: "banque", label: "Banque", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "associe", label: "Associé", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { value: "autre", label: "Autre", color: "bg-slate-50 text-slate-700 border-slate-200" },
];

const API = config.backendUrl;

async function fetchTiers(typeTiers?: string): Promise<Tiers[]> {
  const params = new URLSearchParams();
  if (typeTiers && typeTiers !== "all") params.set("type_tiers", typeTiers);
  const res = await fetch(`${API}/api/tiers?${params}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Erreur");
  return json.data;
}

async function createTiers(body: Partial<Tiers>): Promise<Tiers> {
  const res = await fetch(`${API}/api/tiers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Erreur");
  return json.data;
}

async function updateTiers(id: string, body: Partial<Tiers>): Promise<Tiers> {
  const res = await fetch(`${API}/api/tiers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Erreur");
  return json.data;
}

async function deleteTiers(id: string): Promise<void> {
  const res = await fetch(`${API}/api/tiers/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || "Erreur");
}

// ─── Component ────────────────────────────────────────────────

export function TiersView() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTiers, setEditingTiers] = useState<Tiers | null>(null);

  // Fetch
  const { data: tiersList = [], isLoading } = useQuery({
    queryKey: ["tiers", typeFilter],
    queryFn: () => fetchTiers(typeFilter),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createTiers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
      toast({ title: "Tiers créé avec succès" });
      setDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: string; body: Partial<Tiers> }) =>
      updateTiers(vars.id, vars.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
      toast({ title: "Tiers mis à jour" });
      setDialogOpen(false);
      setEditingTiers(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTiers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tiers"] });
      toast({ title: "Tiers désactivé" });
    },
  });

  // Columns
  const columns: DataTableColumn<Tiers>[] = useMemo(
    () => [
      {
        id: "code",
        header: "Code",
        accessorKey: "code",
        width: 90,
        cell: (row) => (
          <span className="font-mono text-sm font-medium text-slate-800">{row.code}</span>
        ),
      },
      {
        id: "raison_sociale",
        header: "Raison Sociale",
        accessorKey: "raison_sociale",
        minWidth: 200,
      },
      {
        id: "type_tiers",
        header: "Type",
        accessorKey: "type_tiers",
        width: 110,
        cell: (row) => {
          const t = TYPES_TIERS.find((t) => t.value === row.type_tiers);
          return (
            <Badge variant="outline" className={cn("text-[10px]", t?.color)}>
              {t?.label || row.type_tiers}
            </Badge>
          );
        },
      },
      {
        id: "compte_comptable",
        header: "Compte",
        accessorKey: "compte_comptable",
        width: 100,
        cell: (row) => (
          <span className="font-mono text-xs text-slate-500">
            {row.compte_comptable || "–"}
          </span>
        ),
      },
      {
        id: "telephone",
        header: "Téléphone",
        accessorKey: "telephone",
        width: 130,
        cell: (row) => (
          <span className="text-sm text-slate-600">{row.telephone || "–"}</span>
        ),
      },
      {
        id: "email",
        header: "Email",
        accessorKey: "email",
        width: 180,
        cell: (row) => (
          <span className="text-sm text-slate-600 truncate block max-w-[180px]">
            {row.email || "–"}
          </span>
        ),
      },
      {
        id: "ville",
        header: "Ville",
        accessorKey: "ville",
        width: 120,
        cell: (row) => (
          <span className="text-sm text-slate-600">{row.ville || "–"}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        sortable: false,
        width: 80,
        cell: (row) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setEditingTiers(row);
                setDialogOpen(true);
              }}
            >
              Modifier
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const openCreate = useCallback(() => {
    setEditingTiers(null);
    setDialogOpen(true);
  }, []);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Tiers</h2>
            <p className="text-xs text-slate-500">Clients, fournisseurs et partenaires</p>
          </div>
        </div>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          Nouveau tiers
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={tiersList}
        loading={isLoading}
        exportable
        exportFileName="tiers"
        searchPlaceholder="Rechercher un tiers..."
        searchFilter={(row, q) => {
          const lower = q.toLowerCase();
          return (
            row.code.toLowerCase().includes(lower) ||
            row.raison_sociale.toLowerCase().includes(lower) ||
            (row.nom_commercial || "").toLowerCase().includes(lower)
          );
        }}
        compact
        emptyMessage="Aucun tiers trouvé"
        toolbarActions={
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-[150px] text-xs">
              <SelectValue placeholder="Tous types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous types</SelectItem>
              {TYPES_TIERS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Create/Edit dialog */}
      <TiersFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingTiers(null);
        }}
        tiers={editingTiers}
        onSave={(body) => {
          if (editingTiers) {
            updateMutation.mutate({ id: editingTiers.id, body });
          } else {
            createMutation.mutate(body);
          }
        }}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}

// ─── Form Dialog ──────────────────────────────────────────────

function TiersFormDialog({
  open,
  onClose,
  tiers,
  onSave,
  isLoading,
}: {
  open: boolean;
  onClose: () => void;
  tiers: Tiers | null;
  onSave: (body: Partial<Tiers>) => void;
  isLoading: boolean;
}) {
  const isEdit = !!tiers;
  const [form, setForm] = useState<Partial<Tiers>>({});

  // Reset form when tiers changes
  useState(() => {
    if (tiers) {
      setForm({ ...tiers });
    } else {
      setForm({ type_tiers: "client", est_actif: true, devise: "XOF" });
    }
  });

  // Re-init when dialog opens
  const handleOpenChange = useCallback(() => {
    if (open) {
      if (tiers) {
        setForm({ ...tiers });
      } else {
        setForm({ type_tiers: "client", est_actif: true, devise: "XOF" });
      }
    }
  }, [open, tiers]);

  // run on open
  useState(handleOpenChange);

  const update = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le tiers" : "Nouveau tiers"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Main info */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Code *</Label>
              <Input
                value={form.code || ""}
                onChange={(e) => update("code", e.target.value)}
                placeholder="C001"
                className="h-8 text-sm mt-1"
                disabled={isEdit}
              />
            </div>
            <div>
              <Label className="text-xs">Type *</Label>
              <Select
                value={form.type_tiers || "client"}
                onValueChange={(v) => update("type_tiers", v)}
              >
                <SelectTrigger className="h-8 text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_TIERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Compte comptable</Label>
              <Input
                value={form.compte_comptable || ""}
                onChange={(e) => update("compte_comptable", e.target.value)}
                placeholder="401100"
                className="h-8 text-sm font-mono mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Raison sociale *</Label>
              <Input
                value={form.raison_sociale || ""}
                onChange={(e) => update("raison_sociale", e.target.value)}
                placeholder="Société ABC SARL"
                className="h-8 text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Nom commercial</Label>
              <Input
                value={form.nom_commercial || ""}
                onChange={(e) => update("nom_commercial", e.target.value)}
                placeholder="ABC"
                className="h-8 text-sm mt-1"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Contact</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Téléphone</Label>
                <Input
                  value={form.telephone || ""}
                  onChange={(e) => update("telephone", e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  value={form.email || ""}
                  onChange={(e) => update("email", e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Ville</Label>
                <Input
                  value={form.ville || ""}
                  onChange={(e) => update("ville", e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              </div>
            </div>
            <div className="mt-2">
              <Label className="text-xs">Adresse</Label>
              <Input
                value={form.adresse || ""}
                onChange={(e) => update("adresse", e.target.value)}
                className="h-8 text-sm mt-1"
              />
            </div>
          </div>

          {/* Financial */}
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Conditions financières</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Conditions paiement</Label>
                <Input
                  value={form.conditions_paiement || ""}
                  onChange={(e) => update("conditions_paiement", e.target.value)}
                  placeholder="30 jours fin de mois"
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Délai (jours)</Label>
                <Input
                  type="number"
                  value={form.delai_paiement_jours || ""}
                  onChange={(e) => update("delai_paiement_jours", Number(e.target.value) || 0)}
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Plafond crédit</Label>
                <Input
                  type="number"
                  value={form.plafond_credit || ""}
                  onChange={(e) => update("plafond_credit", Number(e.target.value) || 0)}
                  className="h-8 text-sm mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            disabled={isLoading || !form.code || !form.raison_sociale}
            onClick={() => onSave(form)}
          >
            {isLoading ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Créer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
