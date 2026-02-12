import { useState, useCallback, useMemo } from "react";
import {
  PenLine,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks";
import { saveAccountingEntry } from "@/lib/api/backend-client";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────

interface LigneEcriture {
  id: string;
  numero_compte: string;
  libelle_compte: string;
  libelle_ligne: string;
  debit: number;
  credit: number;
}

const JOURNALS = [
  { code: "AC", label: "Achats" },
  { code: "VE", label: "Ventes" },
  { code: "BQ", label: "Banque" },
  { code: "CA", label: "Caisse" },
  { code: "OD", label: "Opérations Diverses" },
];

function newLigne(): LigneEcriture {
  return {
    id: crypto.randomUUID(),
    numero_compte: "",
    libelle_compte: "",
    libelle_ligne: "",
    debit: 0,
    credit: 0,
  };
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Component ────────────────────────────────────────────────

export function SaisieManuelleView() {
  const { toast } = useToast();

  // Header fields
  const [datePiece, setDatePiece] = useState(todayStr());
  const [numeroPiece, setNumeroPiece] = useState("");
  const [journalCode, setJournalCode] = useState("OD");
  const [libelleGeneral, setLibelleGeneral] = useState("");
  const [tiersCode, setTiersCode] = useState("");
  const [tiersNom, setTiersNom] = useState("");

  // Lines
  const [lignes, setLignes] = useState<LigneEcriture[]>([newLigne(), newLigne()]);
  const [isSaving, setIsSaving] = useState(false);

  // Totals
  const totalDebit = useMemo(
    () => lignes.reduce((s, l) => s + (l.debit || 0), 0),
    [lignes]
  );
  const totalCredit = useMemo(
    () => lignes.reduce((s, l) => s + (l.credit || 0), 0),
    [lignes]
  );
  const equilibre = Math.abs(totalDebit - totalCredit) < 0.01;
  const ecart = Math.abs(totalDebit - totalCredit);

  // Line operations
  const addLigne = useCallback(() => {
    setLignes((prev) => [...prev, newLigne()]);
  }, []);

  const removeLigne = useCallback((id: string) => {
    setLignes((prev) => {
      if (prev.length <= 2) return prev; // Min 2 lignes
      return prev.filter((l) => l.id !== id);
    });
  }, []);

  const updateLigne = useCallback(
    (id: string, field: keyof LigneEcriture, value: string | number) => {
      setLignes((prev) =>
        prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
      );
    },
    []
  );

  // Quick equilibrage: fill last line
  const equilibrer = useCallback(() => {
    if (lignes.length < 2) return;
    const last = lignes[lignes.length - 1];
    const others = lignes.slice(0, -1);
    const sumD = others.reduce((s, l) => s + (l.debit || 0), 0);
    const sumC = others.reduce((s, l) => s + (l.credit || 0), 0);

    if (sumD > sumC) {
      updateLigne(last.id, "credit", Math.round((sumD - sumC + (last.debit || 0)) * 100) / 100);
      if (!last.debit) updateLigne(last.id, "debit", 0);
    } else if (sumC > sumD) {
      updateLigne(last.id, "debit", Math.round((sumC - sumD + (last.credit || 0)) * 100) / 100);
      if (!last.credit) updateLigne(last.id, "credit", 0);
    }
  }, [lignes, updateLigne]);

  // Reset
  const reset = useCallback(() => {
    setDatePiece(todayStr());
    setNumeroPiece("");
    setJournalCode("OD");
    setLibelleGeneral("");
    setTiersCode("");
    setTiersNom("");
    setLignes([newLigne(), newLigne()]);
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    if (!numeroPiece.trim()) {
      toast({ title: "N° Pièce requis", variant: "destructive" });
      return;
    }
    if (!libelleGeneral.trim()) {
      toast({ title: "Libellé requis", variant: "destructive" });
      return;
    }
    if (!equilibre) {
      toast({
        title: "Écriture déséquilibrée",
        description: `Écart de ${ecart.toLocaleString("fr-FR")} FCFA`,
        variant: "destructive",
      });
      return;
    }

    const invalidLines = lignes.filter(
      (l) => !l.numero_compte.trim() || (l.debit === 0 && l.credit === 0)
    );
    if (invalidLines.length > 0) {
      toast({
        title: "Lignes incomplètes",
        description: "Chaque ligne doit avoir un n° de compte et un montant",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const entry = {
        date_piece: datePiece,
        numero_piece: numeroPiece,
        journal_code: journalCode,
        journal_libelle: JOURNALS.find((j) => j.code === journalCode)?.label || journalCode,
        libelle_general: libelleGeneral,
        tiers_code: tiersCode || undefined,
        tiers_nom: tiersNom || undefined,
        lignes: lignes.map((l) => ({
          numero_compte: l.numero_compte,
          libelle_compte: l.libelle_compte || l.libelle_ligne,
          libelle_ligne: l.libelle_ligne,
          debit: l.debit || 0,
          credit: l.credit || 0,
        })),
        total_debit: totalDebit,
        total_credit: totalCredit,
        equilibre: true,
        commentaires: "Saisie manuelle",
      };

      const result = await saveAccountingEntry(entry, {
        iaModel: "manual",
      });

      if (result.success) {
        toast({
          title: "Écriture enregistrée",
          description: `Pièce ${numeroPiece} sauvegardée avec succès`,
        });
        reset();
      } else {
        toast({
          title: "Erreur",
          description: result.error?.message || "Échec de la sauvegarde",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Erreur sauvegarde:", err);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    numeroPiece,
    libelleGeneral,
    equilibre,
    ecart,
    datePiece,
    journalCode,
    tiersCode,
    tiersNom,
    lignes,
    totalDebit,
    totalCredit,
    toast,
    reset,
  ]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <PenLine className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Nouvelle écriture</h2>
          <p className="text-xs text-slate-500">Saisie manuelle d'une pièce comptable</p>
        </div>
      </div>

      {/* Header fields */}
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Date pièce</Label>
            <Input
              type="date"
              value={datePiece}
              onChange={(e) => setDatePiece(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">N° Pièce *</Label>
            <Input
              value={numeroPiece}
              onChange={(e) => setNumeroPiece(e.target.value)}
              placeholder="FA-001"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Journal *</Label>
            <Select value={journalCode} onValueChange={setJournalCode}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOURNALS.map((j) => (
                  <SelectItem key={j.code} value={j.code}>
                    {j.code} – {j.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 md:col-span-1 lg:col-span-1">
            <Label className="text-xs text-slate-500 mb-1 block">Code tiers</Label>
            <Input
              value={tiersCode}
              onChange={(e) => setTiersCode(e.target.value)}
              placeholder="F001..."
              className="h-9 text-sm"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-slate-500 mb-1 block">Libellé général *</Label>
            <Input
              value={libelleGeneral}
              onChange={(e) => setLibelleGeneral(e.target.value)}
              placeholder="Achat de marchandises..."
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Lines */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase w-8">#</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase w-28">Compte</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase w-44">Libellé compte</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase">Libellé</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase w-32">Débit</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase w-32">Crédit</th>
                <th className="px-3 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {lignes.map((ligne, idx) => (
                <tr
                  key={ligne.id}
                  className={cn(
                    "border-b border-slate-100 transition-colors",
                    idx % 2 === 1 && "bg-slate-50/50"
                  )}
                >
                  <td className="px-3 py-1.5 text-slate-400 text-xs">{idx + 1}</td>
                  <td className="px-1.5 py-1.5">
                    <Input
                      value={ligne.numero_compte}
                      onChange={(e) => updateLigne(ligne.id, "numero_compte", e.target.value)}
                      placeholder="601100"
                      className="h-8 text-sm font-mono"
                    />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <Input
                      value={ligne.libelle_compte}
                      onChange={(e) => updateLigne(ligne.id, "libelle_compte", e.target.value)}
                      placeholder="Achats de..."
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <Input
                      value={ligne.libelle_ligne}
                      onChange={(e) => updateLigne(ligne.id, "libelle_ligne", e.target.value)}
                      placeholder="Libellé du mvt"
                      className="h-8 text-sm"
                    />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={ligne.debit || ""}
                      onChange={(e) => updateLigne(ligne.id, "debit", Number(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 text-sm text-right font-mono"
                    />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={ligne.credit || ""}
                      onChange={(e) => updateLigne(ligne.id, "credit", Number(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 text-sm text-right font-mono"
                    />
                  </td>
                  <td className="px-1.5 py-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-500"
                      onClick={() => removeLigne(ligne.id)}
                      disabled={lignes.length <= 2}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Footer totals */}
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={4} className="px-3 py-2.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs text-blue-600 hover:text-blue-700"
                    onClick={addLigne}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter une ligne
                  </Button>
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-sm">
                  {totalDebit.toLocaleString("fr-FR")}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-bold text-sm">
                  {totalCredit.toLocaleString("fr-FR")}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Status bar + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {equilibre ? (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Équilibrée
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Écart: {ecart.toLocaleString("fr-FR")} FCFA
            </Badge>
          )}
          <span className="text-xs text-slate-400">{lignes.length} ligne(s)</span>
        </div>

        <div className="flex items-center gap-2">
          {!equilibre && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={equilibrer}
            >
              Équilibrer auto
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={reset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={isSaving || !equilibre}
            onClick={handleSave}
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
