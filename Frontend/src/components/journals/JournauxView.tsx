/**
 * Vue des Journaux Comptables - Version Pro
 * 
 * REFACTORISÉ: Les sous-composants sont dans le même dossier:
 * - JournalKPICards: grille de KPI par journal
 * - JournalEntriesTable: tableau des écritures
 * - JournalCorrectionDialog: dialogue de correction
 */

import { useState, useEffect, useCallback, DragEvent } from "react";
import {
  BookOpen,
  Calendar,
  Loader2,
  RefreshCw,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getJournaux,
  getJournalSummary,
  getJournalEntries,
  correctEntryJournal,
  type JournalCode,
  type JournalConfig,
  type JournalSummary,
  type JournalEntryRecord,
} from "@/lib/api/backend-client";
import { toast } from "sonner";
import { RegenerateEntryModal } from "./RegenerateEntryModal";

// Import des sous-composants
import { JournalKPICards } from "./JournalKPICards";
import { JournalEntriesTable } from "./JournalEntriesTable";
import { JournalCorrectionDialog } from "./JournalCorrectionDialog";
import { type DragData, type CorrectionConfirmation } from "./journal-types";

export function JournauxView() {
  const [journaux, setJournaux] = useState<JournalConfig[]>([]);
  const [summaries, setSummaries] = useState<JournalSummary[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<JournalCode | null>(null);
  const [entries, setEntries] = useState<JournalEntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [periode, setPeriode] = useState<string>("all");

  // État drag & drop
  const [draggedEntry, setDraggedEntry] = useState<DragData | null>(null);
  const [dropTarget, setDropTarget] = useState<JournalCode | null>(null);
  const [correctionDialog, setCorrectionDialog] = useState<CorrectionConfirmation | null>(null);
  const [isCorreecting, setIsCorreecting] = useState(false);

  // État modal régénération IA
  const [regenerateModal, setRegenerateModal] = useState<{
    open: boolean;
    entry: JournalEntryRecord | null;
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
      setExpandedEntry(null);
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

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedEntry(expandedEntry === id ? null : id);
  };

  // ============ DRAG & DROP HANDLERS ============
  const handleDragStart = (e: DragEvent<HTMLTableRowElement>, entry: JournalEntryRecord) => {
    if (!selectedJournal) return;
    const dragData: DragData = {
      entryId: String(entry.id),
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

      // Ouvrir le modal de régénération IA
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
                date.setDate(1);
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

          {/* KPIs Journaux */}
          <JournalKPICards
            journaux={journaux}
            summaries={summaries}
            selectedJournal={selectedJournal}
            onSelectJournal={setSelectedJournal}
            draggedEntry={draggedEntry}
            dropTarget={dropTarget}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />

          {/* Zone Tableau */}
          {selectedJournal ? (
            <JournalEntriesTable
              selectedJournal={selectedJournal}
              journaux={journaux}
              entries={entries}
              loadingEntries={loadingEntries}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              expandedEntry={expandedEntry}
              onToggleExpand={toggleExpand}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
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

      {/* Dialogue de correction */}
      <JournalCorrectionDialog
        correctionDialog={correctionDialog}
        isCorreecting={isCorreecting}
        onClose={() => setCorrectionDialog(null)}
        onConfirm={confirmCorrection}
      />

      {/* Modal de Régénération IA */}
      {regenerateModal.entry && regenerateModal.fromJournal && regenerateModal.toJournal && (
        <RegenerateEntryModal
          open={regenerateModal.open}
          onOpenChange={(open) => setRegenerateModal(prev => ({ ...prev, open }))}
          entry={regenerateModal.entry}
          fromJournal={regenerateModal.fromJournal}
          toJournal={regenerateModal.toJournal}
          onSuccess={async () => {
            await loadData();
            if (selectedJournal) {
              const res = await getJournalEntries(selectedJournal, { limit: 100 });
              setEntries(res.ecritures);
            }
            setRegenerateModal({ open: false, entry: null, fromJournal: null, toJournal: null });
          }}
        />
      )}
    </div>
  );
}
