/**
 * Vue des Journaux Comptables - Version Pro
 * Design refondu pour une meilleure lisibilité et un style financier.
 */

import { useState, useEffect, useCallback, DragEvent } from "react";
import {
  BookOpen,
  Calendar,
  GripVertical,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Filter,
  Search
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
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { RegenerateEntryModal } from "./RegenerateEntryModal";

// Configuration visuelle stricte
const JOURNAL_THEMES: Record<JournalCode, { border: string; bg: string; text: string; lightBg: string }> = {
  AC: { border: "border-orange-500", bg: "bg-orange-500", text: "text-orange-700", lightBg: "bg-orange-50" },
  VE: { border: "border-emerald-500", bg: "bg-emerald-500", text: "text-emerald-700", lightBg: "bg-emerald-50" },
  BQ: { border: "border-blue-500", bg: "bg-blue-500", text: "text-blue-700", lightBg: "bg-blue-50" },
  CA: { border: "border-purple-500", bg: "bg-purple-500", text: "text-purple-700", lightBg: "bg-purple-50" },
  OD: { border: "border-slate-500", bg: "bg-slate-500", text: "text-slate-700", lightBg: "bg-slate-50" },
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
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null); // ID de l'entrée étendue
  const [searchTerm, setSearchTerm] = useState("");

  const [periode, setPeriode] = useState<string>("all"); // Par défaut: toutes les périodes

  // État drag & drop
  const [draggedEntry, setDraggedEntry] = useState<DragData | null>(null);
  const [dropTarget, setDropTarget] = useState<JournalCode | null>(null);
  const [correctionDialog, setCorrectionDialog] = useState<CorrectionConfirmation | null>(null);
  const [isCorreecting, setIsCorreecting] = useState(false);

  // État modal régénération IA
  const [regenerateModal, setRegenerateModal] = useState<{
    open: boolean;
    entry: JournalEntry | null;
    fromJournal: JournalCode | null;
    toJournal: JournalCode | null;
  }>({ open: false, entry: null, fromJournal: null, toJournal: null });

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

      // Auto-select premier journal si non sélectionné mais données chargées
      if (!selectedJournal && journauxData.length > 0) {
        // Optionnel: sélectionner le premier par défaut
      }
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
      setExpandedEntry(null); // Reset expand
      try {
        const result = await getJournalEntries(selectedJournal, { limit: 100 });
        setEntries(result.ecritures);
      } catch (error) {
        console.error("Erreur chargement écritures:", error);
      } finally {
        setLoadingEntries(false);
      }
    }
    loadEntries();
  }, [selectedJournal]);

  const getSummaryForJournal = (code: JournalCode): JournalSummary | undefined => {
    return summaries.find(s => s.journal_code === code);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0 }).format(amount); // Sans devise pour éviter la surcharge visuelle dans les cellules denses
  };

  const formatAmountCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount);
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la propagation si clic sur la ligne
    setExpandedEntry(expandedEntry === id ? null : id);
  };

  // Filtrage
  const filteredEntries = entries.filter(e =>
    (e.libelle_general || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.numero_piece || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.tiers_nom && e.tiers_nom.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // ============ DRAG & DROP HANDLERS (Inchangé logic, amélioré style) ============
  const handleDragStart = (e: DragEvent<HTMLTableRowElement>, entry: JournalEntry) => {
    if (!selectedJournal) return;
    const dragData: DragData = {
      entryId: String(entry.id), // Ensure string
      fromJournal: selectedJournal,
      libelle: entry.libelle_general,
      montant: entry.total_debit,
      numeroPiece: entry.numero_piece,
    };
    setDraggedEntry(dragData);
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedEntry(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, journalCode: JournalCode) => {
    e.preventDefault();
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
      if (dragData.fromJournal === toJournal) return;
      const entry = entries.find(e => String(e.id) === dragData.entryId);
      if (!entry) return;

      // Ouvrir le modal de régénération IA au lieu du dialogue simple
      setRegenerateModal({
        open: true,
        entry,
        fromJournal: dragData.fromJournal,
        toJournal,
      });
    } catch (error) {
      console.error("Erreur lors du drop:", error);
    }
  };

  const confirmCorrection = async () => {
    if (!correctionDialog) return;
    setIsCorreecting(true);
    try {
      const result = await correctEntryJournal(
        String(correctionDialog.entry.id),
        correctionDialog.toJournal,
        `Correction manuelle: ${correctionDialog.fromJournal} → ${correctionDialog.toJournal}`
      );
      if (result.success) {
        toast.success("Écriture déplacée avec succès !");
        await loadData();
        if (selectedJournal) {
          const res = await getJournalEntries(selectedJournal, { limit: 100 });
          setEntries(res.ecritures);
        }
      } else {
        toast.error(`Erreur: ${result.error}`);
      }
    } catch (error) {
      toast.error("Une erreur est survenue.");
    } finally {
      setIsCorreecting(false);
      setCorrectionDialog(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50/50">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50/30 overflow-hidden">

      {/* Top Bar : Titre et Filtres Période */}
      <div className="bg-white border-b border-sidebar-border/50 px-8 py-5 flex items-center justify-between shadow-sm flex-none">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-sm">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Journaux Comptables</h1>
            <p className="text-sm text-slate-500 font-medium">Gestion et révision des écritures par journal</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
          <Button variant="ghost" size="icon" onClick={() => loadData()} className="text-slate-400 hover:text-slate-700">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          <Select value={periode} onValueChange={setPeriode}>
            <SelectTrigger className="w-[180px] bg-white border-slate-200 shadow-sm font-medium">
              <Calendar className="h-4 w-4 mr-2 text-slate-500" />
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="font-semibold">📊 Toutes les périodes</span>
              </SelectItem>
              {Array.from({ length: 24 }, (_, i) => {
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
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <div className="w-full max-w-[1800px] mx-auto space-y-8">

          {/* Instructions Drag/Drop */}
          {draggedEntry && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-amber-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-bounce">
              <ArrowRightLeft className="h-5 w-5" />
              <span className="font-semibold">Glissez pour changer de journal</span>
            </div>
          )}

          {/* KPIs Journaux - Style Pro */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {journaux.map((journal) => {
              const summary = getSummaryForJournal(journal.code);
              const isActive = selectedJournal === journal.code;
              const isTarget = dropTarget === journal.code;
              const theme = JOURNAL_THEMES[journal.code] || JOURNAL_THEMES.OD;

              return (
                <div
                  key={journal.code}
                  onClick={() => !draggedEntry && setSelectedJournal(isActive ? null : journal.code)}
                  onDragOver={(e) => handleDragOver(e, journal.code)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, journal.code)}
                  className={cn(
                    "relative cursor-pointer transition-all duration-200 rounded-xl border bg-white p-5 flex flex-col justify-between min-h-[110px]",
                    isActive
                      ? `ring-2 ring-offset-2 ring-${theme.bg.split('-')[1]} shadow-md border-transparent`
                      : "hover:border-slate-300 hover:shadow-sm border-slate-200",
                    isTarget && "scale-105 ring-4 ring-amber-400 bg-amber-50 border-amber-300 z-10",
                    draggedEntry && draggedEntry.fromJournal !== journal.code && !isTarget && "border-dashed border-2 opacity-60 bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-slate-700 text-sm tracking-wide">{journal.libelle}</span>
                    <Badge variant="outline" className={cn("font-mono font-bold border-0 bg-slate-100", theme.text)}>
                      {journal.code}
                    </Badge>
                  </div>

                  <div>
                    {summary ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-2xl font-bold text-slate-900 tracking-tight">
                          {formatAmount(summary.total_debit)}
                          <span className="text-sm text-slate-400 font-normal ml-1">F</span>
                        </span>
                        <span className="text-xs font-semibold text-slate-400 uppercase">
                          {summary.nb_ecritures} Écritures
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 opacity-50">
                        <span className="text-2xl font-bold text-slate-300 tracking-tight">
                          0 <span className="text-sm text-slate-300 font-normal ml-1">F</span>
                        </span>
                        <span className="text-xs font-semibold text-slate-300 uppercase">
                          0 Écritures
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Active Indicator */}
                  {isActive && (
                    <div className={cn("absolute bottom-0 left-0 w-full h-1 rounded-b-xl", theme.bg)}></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Zone Tableau */}
          {selectedJournal ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">

              {/* Toolbar Tableau */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-8 rounded-full", JOURNAL_THEMES[selectedJournal].bg)}></div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      Journal {journaux.find(j => j.code === selectedJournal)?.libelle} ({selectedJournal})
                    </h3>
                    <p className="text-xs text-slate-500">
                      {entries.length} écritures trouvées sur la période
                    </p>
                  </div>
                </div>

                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher une pièce..."
                    className="pl-9 bg-slate-50 border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* Tableau */}
              <div className="overflow-x-auto">
                {loadingEntries ? (
                  <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <p>Chargement des lignes...</p>
                  </div>
                ) : entries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-slate-50/30">
                    <div className="bg-slate-100 p-4 rounded-full mb-4">
                      <Filter className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="font-medium">Aucune écriture dans ce journal</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 border-b border-slate-200 hover:bg-slate-50/80">
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead className="w-[120px] font-bold text-slate-700 uppercase text-xs tracking-wider">Date</TableHead>
                        <TableHead className="w-[140px] font-bold text-slate-700 uppercase text-xs tracking-wider">N° Pièce</TableHead>
                        <TableHead className="font-bold text-slate-700 uppercase text-xs tracking-wider">Libellé</TableHead>
                        <TableHead className="font-bold text-slate-700 uppercase text-xs tracking-wider">Tiers</TableHead>
                        <TableHead className="text-right font-bold text-slate-700 uppercase text-xs tracking-wider w-[160px]">Montant</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.map((entry) => {
                        const isExpanded = expandedEntry === String(entry.id);
                        return (
                          <>
                            <TableRow
                              key={entry.id}
                              className={cn(
                                "group cursor-pointer transition-all border-b border-slate-100 hover:bg-slate-50/50",
                                isExpanded && "bg-slate-50 border-b-0"
                              )}
                              onClick={(e) => toggleExpand(String(entry.id), e)}
                              draggable
                              onDragStart={(e) => handleDragStart(e, entry)}
                              onDragEnd={handleDragEnd}
                            >
                              <TableCell className="pl-4">
                                <div className="p-1 rounded cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 hover:bg-slate-200 w-fit">
                                  <GripVertical className="h-4 w-4" />
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm font-medium text-slate-600">
                                {new Date(entry.date_piece).toLocaleDateString("fr-FR")}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="font-mono bg-slate-100 text-slate-700 border-slate-200 rounded-sm px-1.5 py-0.5 pointer-events-none group-hover:bg-white transition-colors">
                                  {entry.numero_piece}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium text-slate-800">
                                {entry.libelle_general}
                              </TableCell>
                              <TableCell className="text-sm text-slate-500">
                                {entry.tiers_nom || <span className="text-slate-300 italic">-</span>}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-slate-700 text-base">
                                {formatAmount(entry.total_debit)}
                              </TableCell>
                              <TableCell className="pr-4">
                                {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-300" />}
                              </TableCell>
                            </TableRow>

                            {/* Lignes détaillées (Expand) */}
                            {isExpanded && (
                              <TableRow className="bg-slate-50 border-b border-slate-200">
                                <TableCell colSpan={7} className="p-0">
                                  <div className="px-12 py-6 bg-slate-50/50 shadow-inner">
                                    <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-slate-100/50 h-9">
                                            <TableHead className="h-9 text-xs font-bold uppercase tracking-wider pl-4 text-slate-500">Compte</TableHead>
                                            <TableHead className="h-9 text-xs font-bold uppercase tracking-wider text-slate-500">Libellé Ligne</TableHead>
                                            <TableHead className="h-9 text-xs font-bold uppercase tracking-wider text-right text-slate-500">Débit</TableHead>
                                            <TableHead className="h-9 text-xs font-bold uppercase tracking-wider text-right pr-4 text-slate-500">Crédit</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {entry.lignes.map((ligne, idx) => (
                                            <TableRow key={`${entry.id}-l-${idx}`} className="h-10 hover:bg-violet-50/20 border-slate-50">
                                              <TableCell className="py-1 font-mono text-sm font-bold text-violet-700 pl-4 bg-violet-50/10 w-[120px] border-r border-slate-50/50">
                                                {ligne.numero_compte || <span className="text-red-400 text-xs italic">Manquant</span>}
                                              </TableCell>
                                              <TableCell className="py-1 text-sm text-slate-700">
                                                {ligne.libelle_ligne || ligne.libelle_compte || entry.libelle_general || <span className="text-slate-300 italic">Libellé manquant</span>}
                                              </TableCell>
                                              <TableCell className="py-1 text-right font-mono text-sm text-slate-600">
                                                {ligne.debit > 0 ? formatAmountCurrency(ligne.debit) : ""}
                                              </TableCell>
                                              <TableCell className="py-1 text-right font-mono text-sm text-slate-600 pr-4">
                                                {ligne.credit > 0 ? formatAmountCurrency(ligne.credit) : ""}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          ) : (
            /* Empty State si aucun journal sélectionné */
            <div className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-20 bg-slate-50/50 text-slate-400">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <BookOpen className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-600">Sélectionnez un journal</h3>
              <p>Cliquez sur l'un des journaux ci-dessus pour voir les écritures.</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialogue de correction inchangé mais stylisé */}
      {correctionDialog && (
        <Dialog open={!!correctionDialog} onOpenChange={() => !isCorreecting && setCorrectionDialog(null)}>
          <DialogContent className="sm:max-w-[600px] border-0 shadow-2xl">
            <DialogHeader className="bg-slate-50 -mx-6 -mt-6 px-6 py-4 border-b border-slate-100">
              <DialogTitle className="flex items-center gap-2 text-slate-800">
                <div className="bg-amber-100 p-1.5 rounded-full">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                Correction d'imputation comptable
              </DialogTitle>
              <DialogDescription>
                Confirmation du déplacement d'une écriture entre journaux.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-6">

              {/* Visualisation Flux */}
              <div className="flex items-center justify-between px-8">
                {/* Source */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Origine</span>
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg", JOURNAL_THEMES[correctionDialog.fromJournal].bg)}>
                    {correctionDialog.fromJournal}
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center gap-1 flex-1 px-4">
                  <div className="w-full h-0.5 bg-slate-200 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 -ml-1">
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    Correction manuelle
                  </span>
                </div>

                {/* Dest */}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Destination</span>
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg ring-4 ring-offset-2 ring-emerald-100", JOURNAL_THEMES[correctionDialog.toJournal].bg)}>
                    {correctionDialog.toJournal}
                  </div>
                </div>
              </div>

              {/* Détails Écriture */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                      {correctionDialog.entry.numero_piece}
                      <Badge variant="outline" className="text-[10px] h-5 bg-white">
                        {new Date(correctionDialog.entry.date_piece).toLocaleDateString()}
                      </Badge>
                    </h4>
                    <p className="text-sm text-slate-600 mt-1">{correctionDialog.entry.libelle_general}</p>
                  </div>
                  <span className="font-mono font-bold text-lg text-slate-900">
                    {formatAmountCurrency(correctionDialog.entry.total_debit)}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Mise à jour automatique des comptes de contrepartie
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-50 -mx-6 -mb-6 px-6 py-4 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setCorrectionDialog(null)} className="text-slate-500 hover:text-slate-800 hover:bg-white">Annuler</Button>
              <Button onClick={confirmCorrection} className="bg-slate-900 hover:bg-slate-800 shadow-lg text-white font-medium px-6">
                {isCorreecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Traitement...
                  </>
                ) : "Confirmer le transfert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Régénération IA */}
      {regenerateModal.entry && regenerateModal.fromJournal && regenerateModal.toJournal && (
        <RegenerateEntryModal
          open={regenerateModal.open}
          onOpenChange={(open) => setRegenerateModal(prev => ({ ...prev, open }))}
          entry={regenerateModal.entry}
          fromJournal={regenerateModal.fromJournal}
          toJournal={regenerateModal.toJournal}
          onSuccess={async () => {
            // Recharger les données après succès
            await loadData();
            if (selectedJournal) {
              const res = await getJournalEntries(selectedJournal, { limit: 100 });
              setEntries(res.ecritures);
            }
            // Fermer le modal
            setRegenerateModal({ open: false, entry: null, fromJournal: null, toJournal: null });
          }}
        />
      )}
    </div>
  );
}
