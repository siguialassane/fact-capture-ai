/**
 * Vue des Journaux Comptables avec Drag & Drop
 * 
 * Affiche les journaux AC, VE, BQ, CA, OD avec leurs écritures
 * Permet de déplacer des écritures entre journaux par glisser-déposer
 */

import { useState, useEffect, useCallback, DragEvent } from "react";
import {
  BookOpen,
  ShoppingCart,
  TrendingUp,
  Building2,
  Wallet,
  FileSpreadsheet,
  Calendar,
  GripVertical,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getJournaux,
  getJournalSummary,
  getJournalEntries,
  correctEntryJournal,
  JOURNAL_CONTREPARTIE,
  type JournalCode,
  type JournalConfig,
  type JournalSummary,
  type JournalEntry,
} from "@/lib/journals-api";
import { toast } from "sonner";

const JOURNAL_ICONS: Record<JournalCode, React.ReactNode> = {
  AC: <ShoppingCart className="h-5 w-5" />,
  VE: <TrendingUp className="h-5 w-5" />,
  BQ: <Building2 className="h-5 w-5" />,
  CA: <Wallet className="h-5 w-5" />,
  OD: <FileSpreadsheet className="h-5 w-5" />,
};

const JOURNAL_COLORS: Record<JournalCode, string> = {
  AC: "bg-orange-100 text-orange-700 border-orange-200",
  VE: "bg-green-100 text-green-700 border-green-200",
  BQ: "bg-blue-100 text-blue-700 border-blue-200",
  CA: "bg-purple-100 text-purple-700 border-purple-200",
  OD: "bg-slate-100 text-slate-700 border-slate-200",
};

const JOURNAL_DROP_COLORS: Record<JournalCode, string> = {
  AC: "ring-4 ring-orange-400 bg-orange-50",
  VE: "ring-4 ring-green-400 bg-green-50",
  BQ: "ring-4 ring-blue-400 bg-blue-50",
  CA: "ring-4 ring-purple-400 bg-purple-50",
  OD: "ring-4 ring-slate-400 bg-slate-50",
};

interface DragData {
  entryId: string;
  fromJournal: JournalCode;
  libelle: string;
  montant: number;
  numeroPiece: string;
}

interface CorrectionConfirmation {
  entry: JournalEntry;
  fromJournal: JournalCode;
  toJournal: JournalCode;
}

export function JournauxView() {
  const [journaux, setJournaux] = useState<JournalConfig[]>([]);
  const [summaries, setSummaries] = useState<JournalSummary[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<JournalCode | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [periode, setPeriode] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // État drag & drop
  const [draggedEntry, setDraggedEntry] = useState<DragData | null>(null);
  const [dropTarget, setDropTarget] = useState<JournalCode | null>(null);
  const [correctionDialog, setCorrectionDialog] = useState<CorrectionConfirmation | null>(null);
  const [isCorreecting, setIsCorreecting] = useState(false);

  // Charger les journaux et résumés
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [journauxData, summaryData] = await Promise.all([
        getJournaux(),
        getJournalSummary(periode),
      ]);
      setJournaux(journauxData);
      setSummaries(summaryData);
    } catch (error) {
      console.error("Erreur chargement journaux:", error);
      toast.error("Erreur de chargement des journaux");
    } finally {
      setLoading(false);
    }
  }, [periode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Charger les écritures d'un journal
  useEffect(() => {
    async function loadEntries() {
      if (!selectedJournal) {
        setEntries([]);
        return;
      }
      
      setLoadingEntries(true);
      try {
        const result = await getJournalEntries(selectedJournal, { limit: 50 });
        setEntries(result.ecritures);
      } catch (error) {
        console.error("Erreur chargement écritures:", error);
      } finally {
        setLoadingEntries(false);
      }
    }
    loadEntries();
  }, [selectedJournal]);

  // Obtenir le résumé d'un journal
  const getSummaryForJournal = (code: JournalCode): JournalSummary | undefined => {
    return summaries.find(s => s.journal_code === code);
  };

  const formatMontant = (montant: number) => {
    return montant.toLocaleString("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // ============ DRAG & DROP HANDLERS ============

  const handleDragStart = (e: DragEvent<HTMLTableRowElement>, entry: JournalEntry) => {
    if (!selectedJournal) return;

    const dragData: DragData = {
      entryId: entry.id,
      fromJournal: selectedJournal,
      libelle: entry.libelle_general,
      montant: entry.total_debit,
      numeroPiece: entry.numero_piece,
    };

    setDraggedEntry(dragData);
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = "move";

    // Style de l'élément drag
    if (e.currentTarget) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: DragEvent<HTMLTableRowElement>) => {
    setDraggedEntry(null);
    setDropTarget(null);
    if (e.currentTarget) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, journalCode: JournalCode) => {
    e.preventDefault();
    
    // Ne pas permettre le drop sur le même journal
    if (draggedEntry && draggedEntry.fromJournal !== journalCode) {
      e.dataTransfer.dropEffect = "move";
      setDropTarget(journalCode);
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, toJournal: JournalCode) => {
    e.preventDefault();
    setDropTarget(null);

    try {
      const data = e.dataTransfer.getData("application/json");
      if (!data) return;

      const dragData: DragData = JSON.parse(data);
      
      // Ne pas permettre le drop sur le même journal
      if (dragData.fromJournal === toJournal) return;

      // Trouver l'écriture complète
      const entry = entries.find(e => e.id === dragData.entryId);
      if (!entry) return;

      // Ouvrir le dialogue de confirmation
      setCorrectionDialog({
        entry,
        fromJournal: dragData.fromJournal,
        toJournal,
      });
    } catch (error) {
      console.error("Erreur lors du drop:", error);
    }
  };

  // Confirmer la correction
  const confirmCorrection = async () => {
    if (!correctionDialog) return;

    setIsCorreecting(true);
    try {
      const result = await correctEntryJournal(
        correctionDialog.entry.id,
        correctionDialog.toJournal,
        `Correction manuelle: ${correctionDialog.fromJournal} → ${correctionDialog.toJournal}`
      );

      if (result.success) {
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-medium">Écriture déplacée avec succès !</span>
            <span className="text-xs text-slate-500">
              {correctionDialog.entry.numero_piece} : {correctionDialog.fromJournal} → {correctionDialog.toJournal}
            </span>
            {result.changes?.updated_accounts && result.changes.updated_accounts.length > 0 && (
              <span className="text-xs text-emerald-600">
                {result.changes.updated_accounts.length} compte(s) mis à jour
              </span>
            )}
          </div>
        );

        // Recharger les données
        await loadData();
        
        // Recharger les écritures du journal sélectionné
        if (selectedJournal) {
          const result = await getJournalEntries(selectedJournal, { limit: 50 });
          setEntries(result.ecritures);
        }
      } else {
        toast.error(`Erreur: ${result.error}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Erreur: ${errorMessage}`);
    } finally {
      setIsCorreecting(false);
      setCorrectionDialog(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100">
            <BookOpen className="h-6 w-6 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Journaux Comptables</h2>
            <p className="text-sm text-slate-500">
              SYSCOHADA - Glissez les écritures pour corriger le journal
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={periode} onValueChange={setPeriode}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
                return (
                  <SelectItem key={value} value={value}>
                    {date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={() => loadData()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Instruction drag & drop */}
      {draggedEntry && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 animate-pulse">
          <ArrowRightLeft className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-amber-700">
            Déposez <strong>{draggedEntry.numeroPiece}</strong> sur un autre journal pour corriger l'affectation
          </span>
        </div>
      )}

      {/* Cartes des journaux - zones de drop */}
      <div className="grid grid-cols-5 gap-4">
        {journaux.map((journal) => {
          const summary = getSummaryForJournal(journal.code);
          const isSelected = selectedJournal === journal.code;
          const isDropTarget = dropTarget === journal.code;
          const canDrop = draggedEntry && draggedEntry.fromJournal !== journal.code;
          
          return (
            <div
              key={journal.code}
              onDragOver={(e) => handleDragOver(e, journal.code)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, journal.code)}
            >
              <Card
                className={`cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-emerald-500" : "hover:shadow-md"
                } ${JOURNAL_COLORS[journal.code]} ${
                  isDropTarget ? JOURNAL_DROP_COLORS[journal.code] : ""
                } ${canDrop ? "border-dashed" : ""}`}
                onClick={() => !draggedEntry && setSelectedJournal(isSelected ? null : journal.code)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    {JOURNAL_ICONS[journal.code]}
                    <Badge variant="outline" className="font-mono">
                      {journal.code}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{journal.libelle}</h3>
                  
                  {/* Indicateur de drop */}
                  {isDropTarget && (
                    <div className="text-xs font-medium mt-2 p-1 bg-white/50 rounded text-center">
                      ↓ Déposer ici pour journal {journal.code}
                    </div>
                  )}
                  
                  {!isDropTarget && (
                    <div className="text-xs opacity-80">
                      {summary ? (
                        <>
                          <div>{summary.nb_ecritures} écritures</div>
                          <div className="font-mono mt-1">
                            {formatMontant(summary.total_debit)} FCFA
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-400">Aucune écriture</span>
                      )}
                    </div>
                  )}
                  
                  {/* Info contrepartie */}
                  <div className="text-[10px] mt-2 text-slate-500">
                    Contrepartie: {JOURNAL_CONTREPARTIE[journal.code]?.compte || "—"}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Détail du journal sélectionné */}
      {selectedJournal && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {JOURNAL_ICONS[selectedJournal]}
                {journaux.find(j => j.code === selectedJournal)?.libelle}
                <Badge variant="outline" className="ml-2 text-xs">
                  Glissez une ligne vers un autre journal pour corriger
                </Badge>
              </CardTitle>
              <Badge className={JOURNAL_COLORS[selectedJournal]}>
                {entries.length} écritures
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loadingEntries ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                Aucune écriture dans ce journal
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead className="w-[150px]">N° Pièce</TableHead>
                      <TableHead>Libellé</TableHead>
                      <TableHead>Tiers</TableHead>
                      <TableHead className="text-right">Débit</TableHead>
                      <TableHead className="text-right">Crédit</TableHead>
                      <TableHead className="w-[80px]">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => (
                      <TableRow 
                        key={entry.id} 
                        className="cursor-grab hover:bg-slate-50 active:cursor-grabbing"
                        draggable
                        onDragStart={(e) => handleDragStart(e, entry)}
                        onDragEnd={handleDragEnd}
                      >
                        <TableCell className="text-slate-400">
                          <GripVertical className="h-4 w-4" />
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {new Date(entry.date_piece).toLocaleDateString("fr-FR")}
                        </TableCell>
                        <TableCell className="font-mono text-sm text-violet-600">
                          {entry.numero_piece}
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate">
                          {entry.libelle_general}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {entry.tiers_nom || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-blue-600">
                          {formatMontant(entry.total_debit)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-emerald-600">
                          {formatMontant(entry.total_credit)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={entry.statut === "validee" ? "default" : "outline"}
                            className="text-xs"
                          >
                            {entry.statut}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogue de confirmation de correction */}
      <Dialog open={!!correctionDialog} onOpenChange={() => !isCorreecting && setCorrectionDialog(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmer la correction du journal
            </DialogTitle>
            <DialogDescription>
              Cette action va déplacer l'écriture et mettre à jour les comptes de contrepartie.
            </DialogDescription>
          </DialogHeader>

          {correctionDialog && (
            <div className="space-y-4 py-4">
              {/* Écriture concernée */}
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="text-sm font-medium">{correctionDialog.entry.libelle_general}</div>
                <div className="text-xs text-slate-500 mt-1">
                  Pièce: {correctionDialog.entry.numero_piece}
                </div>
                <div className="text-sm font-mono mt-2">
                  {formatMontant(correctionDialog.entry.total_debit)} FCFA
                </div>
              </div>

              {/* Visualisation du changement */}
              <div className="flex items-center justify-center gap-4">
                <div className={`p-3 rounded-lg text-center ${JOURNAL_COLORS[correctionDialog.fromJournal]}`}>
                  <div className="text-lg font-bold">{correctionDialog.fromJournal}</div>
                  <div className="text-xs">
                    Contrepartie: {JOURNAL_CONTREPARTIE[correctionDialog.fromJournal]?.compte}
                  </div>
                </div>
                
                <ArrowRightLeft className="h-6 w-6 text-slate-400" />
                
                <div className={`p-3 rounded-lg text-center ${JOURNAL_COLORS[correctionDialog.toJournal]}`}>
                  <div className="text-lg font-bold">{correctionDialog.toJournal}</div>
                  <div className="text-xs">
                    Contrepartie: {JOURNAL_CONTREPARTIE[correctionDialog.toJournal]?.compte}
                  </div>
                </div>
              </div>

              {/* Avertissement */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <strong>Attention:</strong> Les comptes de contrepartie seront automatiquement mis à jour 
                ({JOURNAL_CONTREPARTIE[correctionDialog.fromJournal]?.compte} → {JOURNAL_CONTREPARTIE[correctionDialog.toJournal]?.compte})
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCorrectionDialog(null)}
              disabled={isCorreecting}
            >
              Annuler
            </Button>
            <Button
              onClick={confirmCorrection}
              disabled={isCorreecting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isCorreecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Correction en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmer la correction
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
